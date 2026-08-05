-- Consumo real da disponibilidade cadastrada pelo médico (medicos.disponibilidade_dias /
-- disponibilidade_horarios) no agendamento do paciente, com atribuição automática ao
-- médico que atendeu menos consultas (em vez de fila manual first-come-first-served).

CREATE OR REPLACE FUNCTION public.dia_semana_pt(p_data date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE EXTRACT(dow FROM p_data)::int
    WHEN 1 THEN 'Segunda-feira'
    WHEN 2 THEN 'Terça-feira'
    WHEN 3 THEN 'Quarta-feira'
    WHEN 4 THEN 'Quinta-feira'
    WHEN 5 THEN 'Sexta-feira'
    WHEN 6 THEN 'Sábado'
    ELSE NULL
  END;
$$;

-- Lista as combinações (data, horário) com pelo menos um médico ativo, fora de
-- modo férias, disponível e ainda sem consulta marcada naquele horário.
CREATE OR REPLACE FUNCTION public.consultas_slots_disponiveis(p_dias_a_frente int DEFAULT 45)
RETURNS TABLE(data date, horario text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dias AS (
    SELECT d::date AS data
    FROM generate_series(
      current_date,
      current_date + (GREATEST(p_dias_a_frente, 1) || ' days')::interval,
      '1 day'
    ) d
  ),
  candidatos AS (
    SELECT dias.data, trim(h.horario) AS horario, m.id AS medico_id
    FROM dias
    JOIN medicos m
      ON m.status = 'ativo'
      AND coalesce(m.modo_ferias, false) = false
      AND m.disponibilidade_dias IS NOT NULL
      AND m.disponibilidade_horarios IS NOT NULL
      AND public.dia_semana_pt(dias.data) = ANY(string_to_array(m.disponibilidade_dias, ','))
    CROSS JOIN LATERAL unnest(string_to_array(m.disponibilidade_horarios, ',')) AS h(horario)
  )
  SELECT c.data, c.horario
  FROM candidatos c
  WHERE (
      c.data > current_date
      OR (c.data = current_date AND (replace(c.horario, 'h', ':') || ':00')::time > (now() AT TIME ZONE 'America/Sao_Paulo')::time)
    )
    AND NOT EXISTS (
      SELECT 1 FROM consultas co
      WHERE co.medico_id = c.medico_id
        AND co.status IN ('agendada', 'em_andamento')
        AND (co.data_consulta AT TIME ZONE 'America/Sao_Paulo') = (c.data::text || ' ' || replace(c.horario, 'h', ':'))::timestamp
    )
  GROUP BY c.data, c.horario
  ORDER BY c.data, c.horario;
$$;

GRANT EXECUTE ON FUNCTION public.consultas_slots_disponiveis(int) TO authenticated;

-- Atribui automaticamente a consulta (medico_id ainda nulo) ao médico disponível
-- naquele dia/horário que finalizou menos atendimentos até agora. Retorna o
-- medico_id atribuído, ou NULL se nenhum médico corresponder (a consulta segue
-- na fila manual como fallback, via o trigger notify_medicos_nova_consulta_fila já existente).
CREATE OR REPLACE FUNCTION public.atribuir_medico_automatico(p_consulta_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data timestamptz;
  v_local timestamp;
  v_dia_nome text;
  v_horario text;
  v_medico_id uuid;
BEGIN
  SELECT data_consulta INTO v_data
  FROM consultas
  WHERE id = p_consulta_id AND medico_id IS NULL AND status = 'agendada';

  IF v_data IS NULL THEN
    RETURN NULL;
  END IF;

  v_local := v_data AT TIME ZONE 'America/Sao_Paulo';
  v_dia_nome := public.dia_semana_pt(v_local::date);
  v_horario := to_char(v_local, 'HH24"h"MI');

  IF v_dia_nome IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT m.id INTO v_medico_id
  FROM medicos m
  WHERE m.status = 'ativo'
    AND coalesce(m.modo_ferias, false) = false
    AND m.disponibilidade_dias IS NOT NULL
    AND v_dia_nome = ANY(string_to_array(m.disponibilidade_dias, ','))
    AND m.disponibilidade_horarios IS NOT NULL
    AND v_horario = ANY(
      SELECT trim(x) FROM unnest(string_to_array(m.disponibilidade_horarios, ',')) AS x
    )
    AND NOT EXISTS (
      SELECT 1 FROM consultas c2
      WHERE c2.medico_id = m.id
        AND c2.status IN ('agendada', 'em_andamento')
        AND c2.data_consulta = v_data
    )
  ORDER BY
    (SELECT count(*) FROM consultas c3 WHERE c3.medico_id = m.id AND c3.status = 'finalizada') ASC,
    m.total_atendimentos ASC,
    random()
  LIMIT 1;

  IF v_medico_id IS NOT NULL THEN
    UPDATE consultas SET medico_id = v_medico_id, updated_at = now() WHERE id = p_consulta_id;
  END IF;

  RETURN v_medico_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atribuir_medico_automatico(uuid) TO authenticated;
