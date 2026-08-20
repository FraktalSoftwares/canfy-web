-- QA: o carimbo de horário da observação automática de +15 ausências vinha em UTC.
--
-- trg_medico_auto_inativa (20260528130000_medicos_pendencias_aditivo.sql) usava
-- to_char(NOW(), ...) sem AT TIME ZONE. A sessão do Postgres no Supabase é UTC,
-- então o texto gravado em medicos.observacoes_admin saía 3h adiantado em
-- relação ao horário de Brasília. Todas as demais funções do projeto já usam
-- AT TIME ZONE 'America/Sao_Paulo'.
--
-- Apenas o CREATE OR REPLACE da função é necessário: o trigger continua
-- apontando para ela. Observações já gravadas mantêm o carimbo antigo — o texto
-- fica embutido em observacoes_admin (campo editável pelo admin) e reescrevê-lo
-- retroativamente correria o risco de sobrescrever edições manuais.

CREATE OR REPLACE FUNCTION public.trg_medico_auto_inativa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.total_ausencias > 15
     AND NEW.status::text = 'ativo'
     AND (OLD.total_ausencias IS NULL OR OLD.total_ausencias <= 15) THEN
    NEW.status := 'inativo'::status_medico;
    NEW.observacoes_admin := COALESCE(NEW.observacoes_admin || E'\n\n', '')
      || '[Sistema ' || to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      || '] Conta inativada automaticamente: tolerância de 15 ausências em consultas no ano foi excedida.';
  END IF;
  RETURN NEW;
END;
$$;
