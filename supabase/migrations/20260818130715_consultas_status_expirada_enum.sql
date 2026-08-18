-- Novo status para consultas que ficaram na fila sem nenhum médico aceitar
-- dentro da janela de 30 min do despacho por nível de prioridade (discovery:
-- board FigJam 9sSwRN9A4CYPH3JuiQDIPX, nó 1208:4019).
ALTER TYPE public.status_consulta ADD VALUE IF NOT EXISTS 'expirada';
