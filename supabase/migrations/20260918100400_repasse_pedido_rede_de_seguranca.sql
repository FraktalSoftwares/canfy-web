-- Rede de segurança do repasse de pedido + destravamento de transferência presa.
--
-- 1) A migração 20260918100100 removeu a trigger pedido_entregue_gerar_repasse
--    porque, com split, a comissão passa a ser creditada no pagamento. Só que
--    isso abre duas janelas em que a comissão desapareceria sem ninguém notar:
--      * entre esta migração e o deploy da Edge Function com split;
--      * sempre que a criação do repasse falhar no momento da cobrança.
--    A trigger volta como BACKSTOP, não como caminho principal: gerar_repasse_pedido
--    já sai cedo se o pedido tiver repasse, e há índice único em pedido_id, então
--    ela nunca duplica o que o split criou.
--
-- 2) gerar_repasse_pedido agora levanta exceção para pedido sem receita (antes
--    devolvia NULL em silêncio). Numa trigger isso abortaria o UPDATE do pedido,
--    impedindo o admin de marcar a entrega. A trigger passa a capturar a falha e
--    registrá-la, nunca a bloquear a operação.

CREATE OR REPLACE FUNCTION public.trg_pedido_entregue_gerar_repasse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM public.gerar_repasse_pedido(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Nunca impedir a entrega do pedido por causa do financeiro, mas também
    -- nunca perder a comissão em silêncio: o motivo vai para os logs e o pedido
    -- fica sem repasse, visível como ausência na tela de repasses.
    RAISE WARNING 'Comissão do pedido % não pôde ser gerada: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS pedido_entregue_gerar_repasse ON public.pedidos;
CREATE TRIGGER pedido_entregue_gerar_repasse
AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW
WHEN (NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_pedido_entregue_gerar_repasse();

REVOKE EXECUTE ON FUNCTION public.trg_pedido_entregue_gerar_repasse() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) asaas-transferir-repasse marca a linha como BANK_PROCESSING antes de
--    chamar o Asaas, para que dois disparos concorrentes não transfiram duas
--    vezes. Se o processo morrer entre a marcação e a resposta, a linha fica
--    presa nesse estado. O reprocesso precisa poder destravá-la.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_repasse_reprocessar(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url         text;
  v_secret      text;
  v_status      text;
  v_transfer_id text;
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para reprocessar repasses.';
  END IF;

  SELECT rm.status, rm.asaas_transfer_id
    INTO v_status, v_transfer_id
    FROM repasses_medicos rm WHERE rm.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repasse não encontrado.';
  END IF;
  IF v_status <> 'pendente' THEN
    RAISE EXCEPTION 'Apenas repasses pendentes podem ser reprocessados (status atual: %).', v_status;
  END IF;
  IF v_transfer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este repasse já possui a transferência % no Asaas.', v_transfer_id;
  END IF;

  -- Limpa o impedimento e devolve a linha ao estado reprocessável.
  UPDATE repasses_medicos
     SET erro = NULL,
         asaas_status = 'PENDING'
   WHERE id = p_id;

  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault sem project_url/cron_dispatch_secret: não é possível disparar a transferência.';
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/asaas-transferir-repasse',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := jsonb_build_object('repasse_id', p_id)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_repasse_reprocessar(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_repasse_reprocessar(uuid) TO authenticated;
