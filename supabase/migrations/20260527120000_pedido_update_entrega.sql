-- Trigger admin para finalizar pedido: status pós-aprovação, código rastreio, prazo entrega

CREATE OR REPLACE FUNCTION public.admin_update_pedido_entrega(
  p_id uuid,
  p_status text DEFAULT NULL,
  p_codigo_rastreio text DEFAULT NULL,
  p_prazo_entrega_inicio date DEFAULT NULL,
  p_prazo_entrega_fim date DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status text;
  v_old_rastreio text;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('em_separacao', 'enviado', 'entregue') THEN
    RAISE EXCEPTION 'status inválido: %', p_status;
  END IF;

  IF p_prazo_entrega_inicio IS NOT NULL
     AND p_prazo_entrega_fim IS NOT NULL
     AND p_prazo_entrega_inicio > p_prazo_entrega_fim THEN
    RAISE EXCEPTION 'prazo de entrega: data inicial deve ser anterior ou igual à final';
  END IF;

  SELECT status::text, codigo_rastreio
    INTO v_old_status, v_old_rastreio
    FROM pedidos
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pedido não encontrado';
  END IF;

  IF p_status IS NOT NULL AND v_old_status NOT IN ('aprovado', 'em_separacao', 'enviado', 'entregue') THEN
    RAISE EXCEPTION 'pedido precisa estar aprovado para receber atualização de entrega (status atual: %)', v_old_status;
  END IF;

  UPDATE pedidos
     SET status                 = COALESCE(p_status::status_pedido, status),
         codigo_rastreio        = COALESCE(p_codigo_rastreio, codigo_rastreio),
         rastreio_atualizado_em = CASE
           WHEN p_codigo_rastreio IS NOT NULL
                AND p_codigo_rastreio IS DISTINCT FROM v_old_rastreio
           THEN NOW()
           ELSE rastreio_atualizado_em
         END,
         prazo_entrega_inicio   = COALESCE(p_prazo_entrega_inicio, prazo_entrega_inicio),
         prazo_entrega_fim      = COALESCE(p_prazo_entrega_fim, prazo_entrega_fim),
         updated_at             = NOW()
   WHERE id = p_id;

  IF p_status IS NOT NULL AND p_status IS DISTINCT FROM v_old_status THEN
    INSERT INTO pedido_historico (pedido_id, status_anterior, status_novo, responsavel_id, observacao)
    VALUES (p_id, v_old_status, p_status, auth.uid(), p_observacao);
  ELSIF p_observacao IS NOT NULL AND length(trim(p_observacao)) > 0 THEN
    INSERT INTO pedido_historico (pedido_id, status_anterior, status_novo, responsavel_id, observacao)
    VALUES (p_id, v_old_status, v_old_status, auth.uid(), p_observacao);
  END IF;
END;
$function$;
