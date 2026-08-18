-- Duas correções na fila de prioridade, encontradas ao validar a matriz do
-- discovery (board FigJam 9sSwRN9A4CYPH3JuiQDIPX, nó 1208:4019) caso a caso:
--
-- 1) Níveis vazios travavam a fila. A elegibilidade de um médico não muda com
--    o tempo (queixas e disponibilidade são estáticas para uma dada consulta),
--    então esperar num nível sem nenhum médico não dá chance a ninguém — só
--    queima a janela de 30min do paciente. Caso concreto: consulta sem
--    sintomas cadastrados (sintomas NULL) tem match=0 para todos, logo só
--    existe no nível 5, que só dispara aos 26min — ninguém era avisado por 26
--    minutos e 4 minutos depois a consulta era reembolsada automaticamente.
--    Agora a fila avança imediatamente enquanto nenhum médico tiver sido
--    notificado, respeitando os tempos do discovery assim que alguém é
--    efetivamente avisado.
--
-- 2) match_count > 2 não casava com nenhum nível (nem com o 5, que exige = 0),
--    fazendo a consulta nunca ser notificada. Hoje a UI limita a 2 sintomas,
--    mas qualquer origem de dados com 3+ (import/admin) cairia nesse buraco.
--    "2 queixas" da tabela passa a significar ">= 2".

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
    (p_nivel = 1 AND match_count >= 2 AND disponivel)
    OR (p_nivel = 2 AND match_count = 1 AND disponivel)
    OR (p_nivel = 3 AND match_count >= 2 AND NOT disponivel)
    OR (p_nivel = 4 AND match_count = 1 AND NOT disponivel)
    OR (p_nivel = 5 AND match_count = 0);
$$;

REVOKE EXECUTE ON FUNCTION public.medicos_elegiveis_nivel(uuid, int) FROM PUBLIC;

-- despachar_nivel passa a devolver quantos médicos foram notificados, para o
-- motor saber se o nível foi produtivo ou se deve avançar na hora.
DROP FUNCTION IF EXISTS public.despachar_nivel(uuid, int);

CREATE FUNCTION public.despachar_nivel(p_consulta_id uuid, p_nivel int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_qtd int := 0;
  v_titulo text := 'Nova consulta disponível';
  v_desc text := CASE
    WHEN p_nivel = 5 THEN 'Uma consulta está aguardando atendimento — toque para assumir.'
    ELSE 'Uma nova consulta compatível com seu perfil está aguardando atendimento.'
  END;
BEGIN
  FOR r IN SELECT medico_id, medico_user_id FROM public.medicos_elegiveis_nivel(p_consulta_id, p_nivel) LOOP
    INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio, rota, rota_params)
    VALUES ('sistema', 'engajamento', v_titulo, v_desc, r.medico_user_id, 'especifico', 'imediato',
            '/appointment', jsonb_build_object('consultaId', p_consulta_id, 'naFila', true));

    PERFORM public.enviar_push_async(
      r.medico_user_id, v_titulo, v_desc,
      jsonb_build_object('consultaId', p_consulta_id::text, 'rota', '/appointment')
    );
    v_qtd := v_qtd + 1;
  END LOOP;

  UPDATE consultas
  SET notificados_nivel = notificados_nivel || to_jsonb(p_nivel)
  WHERE id = p_consulta_id;

  RETURN v_qtd;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.despachar_nivel(uuid, int) FROM PUBLIC;

-- Despacha do primeiro nível ainda não despachado até p_nivel_alvo (definido
-- pelo tempo). Se, ao chegar no alvo, nenhum médico tiver sido notificado
-- ainda, segue avançando os níveis seguintes na hora — nível vazio não dá
-- chance a ninguém, então não faz sentido esperar nele.
CREATE OR REPLACE FUNCTION public.avancar_fila_consulta(p_consulta_id uuid, p_nivel_alvo int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lvl int;
  v_total int := 0;
  v_ja jsonb;
BEGIN
  SELECT notificados_nivel INTO v_ja FROM consultas WHERE id = p_consulta_id;
  IF v_ja IS NULL THEN
    RETURN;
  END IF;

  FOR v_lvl IN 1..5 LOOP
    IF v_ja @> to_jsonb(v_lvl) THEN
      v_total := v_total
        + (SELECT count(*) FROM public.medicos_elegiveis_nivel(p_consulta_id, v_lvl));
      CONTINUE;
    END IF;

    EXIT WHEN v_lvl > p_nivel_alvo AND v_total > 0;

    v_total := v_total + public.despachar_nivel(p_consulta_id, v_lvl);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avancar_fila_consulta(uuid, int) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.escalonar_fila_consultas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_min numeric;
  v_alvo int;
BEGIN
  FOR r IN
    SELECT id, fila_desde
    FROM consultas
    WHERE medico_id IS NULL AND status = 'agendada' AND fila_desde IS NOT NULL
  LOOP
    v_min := EXTRACT(EPOCH FROM (now() - r.fila_desde)) / 60.0;

    v_alvo := CASE
      WHEN v_min >= 26 THEN 5
      WHEN v_min >= 22 THEN 4
      WHEN v_min >= 12 THEN 3
      WHEN v_min >= 2 THEN 2
      ELSE 1
    END;

    PERFORM public.avancar_fila_consulta(r.id, v_alvo);

    IF v_min >= 30 THEN
      PERFORM public.expirar_consulta_sem_medico(r.id);
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.escalonar_fila_consultas() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.notify_medicos_nova_consulta_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.medico_id IS NULL THEN
    PERFORM public.avancar_fila_consulta(NEW.id, 1);
  END IF;
  RETURN NEW;
END;
$$;
