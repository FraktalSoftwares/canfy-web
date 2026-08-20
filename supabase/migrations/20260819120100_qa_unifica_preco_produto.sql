-- QA: "sistema exige o campo preço para ativar um produto mas não tem esse campo".
--
-- Causa: a tabela produtos carrega três colunas de preço (preco, preco_brl,
-- preco_usd) e cada camada lia uma diferente:
--   - ativar_produto valida `preco`
--   - o cadastro web gravava só `preco_brl` / `preco_usd`
--   - o app mobile lê `preco`
--   - as edge functions do Melhor Envio leem `preco_brl ?? preco`
-- Resultado: todo produto criado pelo painel tinha `preco IS NULL` e não podia
-- ser ativado, sem nenhum campo na UI que alimentasse essa coluna.
--
-- Decisão: `preco` passa a ser a fonte da verdade (BRL). O painel agora grava
-- `preco` e espelha `preco_brl` com o mesmo valor, para não quebrar as edge
-- functions. Esta migração faz o backfill dos registros já existentes.

UPDATE public.produtos
SET preco = preco_brl
WHERE preco IS NULL
  AND preco_brl IS NOT NULL;

-- Mantém preco_brl coerente com preco nos registros que só tinham preco.
UPDATE public.produtos
SET preco_brl = preco
WHERE preco_brl IS NULL
  AND preco IS NOT NULL;

-- Trigger de coerência: qualquer escrita futura mantém as duas colunas alinhadas
-- a partir da que foi informada, evitando que a divergência volte a aparecer.
CREATE OR REPLACE FUNCTION public.trg_produto_sync_preco()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.preco IS NULL AND NEW.preco_brl IS NOT NULL THEN
    NEW.preco := NEW.preco_brl;
  ELSIF NEW.preco_brl IS NULL AND NEW.preco IS NOT NULL THEN
    NEW.preco_brl := NEW.preco;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produto_sync_preco ON public.produtos;
CREATE TRIGGER trg_produto_sync_preco
BEFORE INSERT OR UPDATE OF preco, preco_brl ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.trg_produto_sync_preco();

-- Nota: produtos que continuarem com status='ativo' e preco NULL após o backfill
-- (criados antes de ativar_produto existir, driblando a validação) precisam de
-- preço preenchido manualmente no painel. Conferir com:
--   SELECT id, nome_comercial FROM produtos WHERE status='ativo' AND (preco IS NULL OR preco <= 0);
