-- QA C(G-130): correções de causa raiz.

-- A1. RLS de produtos: a única policy de SELECT restringia a status='ativo',
-- escondendo produtos inativados e rascunhos até de admins.
DROP POLICY IF EXISTS "Admins can view all produtos" ON public.produtos;
CREATE POLICY "Admins can view all produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- A3. ultimo_acesso de pacientes/medicos é uma coluna órfã (nunca atualizada
-- pelo app). Usar auth.users.last_sign_in_at, que é sempre atual, com
-- fallback para o valor legado (ex.: dados de seed).
CREATE OR REPLACE FUNCTION public.admin_list_pacientes()
 RETURNS TABLE(id uuid, user_id uuid, nome_completo text, email text, telefone text, cpf text, data_nascimento date, endereco_completo text, total_consultas integer, total_pedidos integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone, ativo boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    pac.id,
    pac.user_id,
    pr.nome_completo,
    (SELECT au.email::text FROM auth.users au WHERE au.id = pac.user_id) as email,
    pr.telefone,
    pac.cpf,
    pac.data_nascimento,
    pac.endereco_completo,
    pac.total_consultas,
    pac.total_pedidos,
    COALESCE((SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = pac.user_id), pac.ultimo_acesso) AS ultimo_acesso,
    pac.created_at,
    pr.ativo
  FROM pacientes pac
  INNER JOIN profiles pr ON pr.id = pac.user_id
  ORDER BY pac.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_medicos()
 RETURNS TABLE(id uuid, nome text, email text, telefone text, cpf text, crm text, uf_crm text, especialidade_nome text, status text, total_atendimentos integer, total_ausencias integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.cpf,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.total_ausencias,
    COALESCE((SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = m.user_id), m.ultimo_acesso) AS ultimo_acesso,
    m.created_at
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  ORDER BY m.created_at DESC;
END;
$function$;

-- A4. consultas_slots_disponiveis calculava medico_id internamente mas
-- descartava a coluna no SELECT final (GROUP BY data, horario). Sem
-- medico_id, o agendamento normal do paciente nunca grava o médico e a
-- consulta não aparece para nenhum médico.
DROP FUNCTION IF EXISTS public.consultas_slots_disponiveis(integer);

CREATE OR REPLACE FUNCTION public.consultas_slots_disponiveis(p_dias_a_frente integer DEFAULT 45)
 RETURNS TABLE(data date, horario text, medico_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT c.data, c.horario, (array_agg(c.medico_id))[1] AS medico_id
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
$function$;
