-- QA C(G-130): adiciona 'rascunho' ao enum de status de produtos.
-- Precisa estar em transação própria: Postgres não permite usar um valor
-- de enum recém-criado na mesma transação em que foi adicionado.
ALTER TYPE public.status_generico ADD VALUE IF NOT EXISTS 'rascunho';
