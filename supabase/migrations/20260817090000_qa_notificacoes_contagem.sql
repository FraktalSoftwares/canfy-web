-- QA: bolinha de notificação não some.
-- Causa: badge (Navbar), central (Notificacoes.tsx) e RLS usavam três
-- definições diferentes de "minhas notificações", e o trigger de fila
-- gerava linhas com destinatario_id NULL que ninguém consegue ver/marcar.

-- Limpa notificações órfãs (destinatario_id NULL com destinatario_tipo
-- 'especifico'): nenhuma política de SELECT/UPDATE as expõe a um usuário.
DELETE FROM public.notificacoes
WHERE destinatario_id IS NULL
  AND destinatario_tipo = 'especifico';

-- Trigger de fila: só notificar médicos com user_id de fato vinculado.
CREATE OR REPLACE FUNCTION public.notify_medicos_nova_consulta_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.medico_id IS NULL THEN
    INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio)
    SELECT
      'sistema', 'engajamento',
      'Nova consulta na fila',
      'Uma nova consulta está aguardando atendimento na fila.',
      m.user_id, 'especifico', 'imediato'
    FROM medicos m
    WHERE m.status = 'ativo'
      AND m.user_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fonte única de verdade para contagem e listagem: mesmo predicado que a
-- RLS de UPDATE ("marcar como lida"), sem o ramo admin-vê-tudo (a caixa
-- pessoal do admin não deve incluir notificação de terceiros) e sem
-- contar notificações agendadas para o futuro.
CREATE OR REPLACE FUNCTION public.contar_notificacoes_nao_lidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM notificacoes n
  WHERE n.lida = false
    AND n.data_envio <= now()
    AND (
      (n.destinatario_tipo = 'especifico' AND n.destinatario_id = auth.uid())
      OR n.destinatario_tipo = 'todos'
      OR (n.destinatario_tipo = 'todos_pacientes' AND EXISTS (SELECT 1 FROM pacientes p WHERE p.user_id = auth.uid()))
      OR (n.destinatario_tipo = 'todos_medicos' AND EXISTS (SELECT 1 FROM medicos m WHERE m.user_id = auth.uid()))
    );

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_minhas_notificacoes()
RETURNS SETOF public.notificacoes
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT n.*
  FROM notificacoes n
  WHERE n.data_envio <= now()
    AND (
      (n.destinatario_tipo = 'especifico' AND n.destinatario_id = auth.uid())
      OR n.destinatario_tipo = 'todos'
      OR (n.destinatario_tipo = 'todos_pacientes' AND EXISTS (SELECT 1 FROM pacientes p WHERE p.user_id = auth.uid()))
      OR (n.destinatario_tipo = 'todos_medicos' AND EXISTS (SELECT 1 FROM medicos m WHERE m.user_id = auth.uid()))
    )
  ORDER BY n.data_envio DESC;
END;
$function$;
