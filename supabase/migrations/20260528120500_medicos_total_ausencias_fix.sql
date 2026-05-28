-- Fix: 20260528120000 guard checava só `cpf`; em ambientes onde cpf já existia,
-- `total_ausencias` não foi criada. Adicionar idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='medicos' AND column_name='total_ausencias'
  ) THEN
    ALTER TABLE public.medicos
      ADD COLUMN total_ausencias INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
