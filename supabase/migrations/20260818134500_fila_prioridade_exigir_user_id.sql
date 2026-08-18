-- Correção: médicos sem user_id (não vinculados a uma conta de auth) não são
-- notificáveis — geravam notificação in-app órfã (destinatario_id NULL, que
-- nenhuma policy de RLS deixa ninguém ler) e chamada de push com userId nulo
-- (HTTP 400 na Edge Function enviar-push). Bug herdado do trigger antigo
-- notify_medicos_nova_consulta_fila, que também não checava user_id.
--
-- Detectado ao validar a cadeia de disparo ponta a ponta via net._http_response.
CREATE OR REPLACE FUNCTION public.medicos_elegiveis_nivel(p_consulta_id uuid, p_nivel int)
RETURNS TABLE(medico_id uuid, medico_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT id, data_consulta, coalesce(sintomas, '{}'::text[]) AS sintomas
    FROM consultas WHERE id = p_consulta_id
  ),
  cand AS (
    SELECT
      m.id AS medico_id,
      m.user_id AS medico_user_id,
      cardinality(
        ARRAY(
          SELECT unnest(c.sintomas)
          INTERSECT
          SELECT unnest(coalesce(m.queixas_atendidas, '{}'::text[]))
        )
      ) AS match_count,
      EXISTS (
        SELECT 1
        WHERE m.disponibilidade_dias IS NOT NULL
          AND m.disponibilidade_horarios IS NOT NULL
          AND public.dia_semana_pt((c.data_consulta AT TIME ZONE 'America/Sao_Paulo')::date)
              = ANY(string_to_array(m.disponibilidade_dias, ','))
          AND to_char(c.data_consulta AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"MI')
              = ANY(SELECT trim(x) FROM unnest(string_to_array(m.disponibilidade_horarios, ',')) AS x)
      ) AS disponivel
    FROM medicos m, c
    WHERE m.status = 'ativo'
      AND m.user_id IS NOT NULL
      AND coalesce(m.modo_ferias, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM consultas c2
        WHERE c2.medico_id = m.id
          AND c2.status IN ('agendada', 'em_andamento')
          AND c2.data_consulta = c.data_consulta
      )
  )
  SELECT medico_id, medico_user_id
  FROM cand
  WHERE
    (p_nivel = 1 AND match_count = 2 AND disponivel)
    OR (p_nivel = 2 AND match_count = 1 AND disponivel)
    OR (p_nivel = 3 AND match_count = 2 AND NOT disponivel)
    OR (p_nivel = 4 AND match_count = 1 AND NOT disponivel)
    OR (p_nivel = 5 AND match_count = 0);
$$;

REVOKE EXECUTE ON FUNCTION public.medicos_elegiveis_nivel(uuid, int) FROM PUBLIC;
