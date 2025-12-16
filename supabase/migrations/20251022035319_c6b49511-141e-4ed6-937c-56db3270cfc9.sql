-- Inserir 3 receitas de exemplo
-- Primeiro, vamos precisar de pacientes e médicos existentes
-- Vou usar IDs genéricos que devem ser ajustados para IDs reais do sistema

-- Inserir receitas de exemplo
INSERT INTO public.receitas (numero_receita, paciente_id, medico_id, data_emissao, validade, status, observacoes)
SELECT 
  'RX-2025-000001',
  (SELECT id FROM public.pacientes LIMIT 1),
  (SELECT id FROM public.medicos LIMIT 1),
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '85 days',
  'ativa'::status_receita,
  'Receita para tratamento de ansiedade e insônia'
WHERE EXISTS (SELECT 1 FROM public.pacientes LIMIT 1) 
  AND EXISTS (SELECT 1 FROM public.medicos LIMIT 1);

INSERT INTO public.receitas (numero_receita, paciente_id, medico_id, data_emissao, validade, status, observacoes)
SELECT 
  'RX-2025-000002',
  (SELECT id FROM public.pacientes LIMIT 1),
  (SELECT id FROM public.medicos LIMIT 1),
  NOW() - INTERVAL '10 days',
  NOW() + INTERVAL '80 days',
  'ativa'::status_receita,
  'Tratamento de dores crônicas'
WHERE EXISTS (SELECT 1 FROM public.pacientes LIMIT 1) 
  AND EXISTS (SELECT 1 FROM public.medicos LIMIT 1);

INSERT INTO public.receitas (numero_receita, paciente_id, medico_id, data_emissao, validade, status, observacoes)
SELECT 
  'RX-2025-000003',
  (SELECT id FROM public.pacientes LIMIT 1),
  (SELECT id FROM public.medicos LIMIT 1),
  NOW() - INTERVAL '95 days',
  NOW() - INTERVAL '5 days',
  'expirada'::status_receita,
  'Receita para controle de epilepsia - EXPIRADA'
WHERE EXISTS (SELECT 1 FROM public.pacientes LIMIT 1) 
  AND EXISTS (SELECT 1 FROM public.medicos LIMIT 1);

-- Adicionar itens às receitas
-- Para a primeira receita
INSERT INTO public.receita_itens (receita_id, produto_id, posologia, quantidade_prescrita, duracao_tratamento)
SELECT 
  r.id,
  (SELECT id FROM public.produtos LIMIT 1),
  '2 gotas sublinguais, 2x ao dia (manhã e noite)',
  2,
  '90 dias'
FROM public.receitas r
WHERE r.numero_receita = 'RX-2025-000001'
  AND EXISTS (SELECT 1 FROM public.produtos LIMIT 1);

-- Para a segunda receita
INSERT INTO public.receita_itens (receita_id, produto_id, posologia, quantidade_prescrita, duracao_tratamento)
SELECT 
  r.id,
  (SELECT id FROM public.produtos LIMIT 1),
  '3 gotas sublinguais, 3x ao dia',
  3,
  '90 dias'
FROM public.receitas r
WHERE r.numero_receita = 'RX-2025-000002'
  AND EXISTS (SELECT 1 FROM public.produtos LIMIT 1);

-- Para a terceira receita
INSERT INTO public.receita_itens (receita_id, produto_id, posologia, quantidade_prescrita, duracao_tratamento)
SELECT 
  r.id,
  (SELECT id FROM public.produtos LIMIT 1),
  '5 gotas sublinguais, 2x ao dia',
  2,
  '90 dias'
FROM public.receitas r
WHERE r.numero_receita = 'RX-2025-000003'
  AND EXISTS (SELECT 1 FROM public.produtos LIMIT 1);