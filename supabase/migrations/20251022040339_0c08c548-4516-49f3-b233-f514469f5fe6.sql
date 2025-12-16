-- Função SECURITY DEFINER para listar todas as receitas (contorna RLS para admins)
CREATE OR REPLACE FUNCTION public.admin_list_receitas()
RETURNS TABLE (
  id uuid,
  numero_receita text,
  data_emissao timestamptz,
  validade date,
  status text,
  paciente_user_id uuid,
  paciente_nome text,
  medico_nome text,
  pedidos jsonb
) AS $$
  SELECT 
    r.id,
    r.numero_receita,
    r.data_emissao,
    r.validade,
    r.status::text,
    pac.user_id,
    pr.nome_completo,
    m.nome,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'numero_pedido', p.numero_pedido,
          'data_pedido', p.data_pedido,
          'valor_total', p.valor_total,
          'canal_aquisicao', p.canal_aquisicao::text
        )
      )
      FROM pedidos p
      WHERE p.receita_id = r.id
    ) as pedidos
  FROM receitas r
  INNER JOIN pacientes pac ON pac.id = r.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  INNER JOIN medicos m ON m.id = r.medico_id
  ORDER BY r.data_emissao DESC
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_list_receitas() TO anon, authenticated;