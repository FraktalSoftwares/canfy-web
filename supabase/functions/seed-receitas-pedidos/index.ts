import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando criação de receitas e pedidos...');

    // Buscar pacientes existentes
    const { data: pacientes, error: pacientesError } = await supabaseAdmin
      .from('pacientes')
      .select('id, user_id')
      .limit(20);

    if (pacientesError) throw pacientesError;
    if (!pacientes || pacientes.length === 0) {
      throw new Error('Nenhum paciente encontrado no banco de dados');
    }

    console.log(`${pacientes.length} pacientes encontrados`);

    // Buscar médicos ativos
    const { data: medicos, error: medicosError } = await supabaseAdmin
      .from('medicos')
      .select('id')
      .eq('status', 'ativo')
      .limit(10);

    if (medicosError) throw medicosError;
    if (!medicos || medicos.length === 0) {
      throw new Error('Nenhum médico ativo encontrado no banco de dados');
    }

    console.log(`${medicos.length} médicos ativos encontrados`);

    // Buscar associações e marcas
    const { data: associacoes, error: associacoesError } = await supabaseAdmin
      .from('associacoes_marcas')
      .select('id')
      .eq('status', 'ativo')
      .limit(10);

    if (associacoesError) throw associacoesError;
    if (!associacoes || associacoes.length === 0) {
      throw new Error('Nenhuma associação/marca encontrada no banco de dados');
    }

    console.log(`${associacoes.length} associações/marcas encontradas`);

    // Buscar produtos ativos
    const { data: produtos, error: produtosError } = await supabaseAdmin
      .from('produtos')
      .select('id')
      .eq('status', 'ativo')
      .limit(20);

    if (produtosError) throw produtosError;
    if (!produtos || produtos.length === 0) {
      throw new Error('Nenhum produto ativo encontrado no banco de dados');
    }

    console.log(`${produtos.length} produtos ativos encontrados`);

    const createdData = {
      receitas: 0,
      receitaItens: 0,
      pedidos: 0,
      pedidoItens: 0,
    };
    const errors: string[] = [];

    // Datas para setembro e outubro 2024
    const receitaDatas = [
      // Setembro 2024 (10 receitas)
      '2024-09-02', '2024-09-05', '2024-09-09', '2024-09-12', '2024-09-16',
      '2024-09-19', '2024-09-23', '2024-09-26', '2024-09-28', '2024-09-30',
      // Outubro 2024 (10 receitas)
      '2024-10-02', '2024-10-05', '2024-10-09', '2024-10-12', '2024-10-16',
      '2024-10-19', '2024-10-21', '2024-10-24', '2024-10-27', '2024-10-30',
    ];

    const statusReceitas = [
      'ativa', 'ativa', 'ativa', 'ativa', 'ativa',
      'ativa', 'ativa', 'ativa', 'ativa', 'ativa',
      'ativa', 'ativa', 'utilizada', 'utilizada', 'utilizada',
      'utilizada', 'utilizada', 'ativa', 'expirada', 'cancelada'
    ];

    const posologias = [
      '1 gota sublingual 2x ao dia (manhã e noite)',
      '2 gotas sublinguais 3x ao dia',
      '3 gotas sublinguais antes de dormir',
      '1 cápsula pela manhã',
      '2 cápsulas ao dia (manhã e noite)',
      '1 aplicação tópica 2x ao dia na área afetada',
      '5 gotas sublinguais a cada 8 horas',
      '1 gota sublingual 4x ao dia',
      '2 gotas sublinguais ao acordar',
      '3 gotas sublinguais antes das refeições',
    ];

    const duracoes = ['30 dias', '60 dias', '90 dias'];

    // Criar receitas em lotes para otimizar
    const receitasParaCriar = [];
    
    for (let i = 0; i < 20; i++) {
      const paciente = pacientes[i % pacientes.length];
      const medico = medicos[Math.floor(Math.random() * medicos.length)];
      const dataEmissao = new Date(receitaDatas[i]);
      const validade = new Date(dataEmissao);
      validade.setDate(validade.getDate() + 90);

      receitasParaCriar.push({
        pacienteId: paciente.id,
        medicoId: medico.id,
        dataEmissao: dataEmissao.toISOString(),
        validade: validade.toISOString().split('T')[0],
        status: statusReceitas[i],
        observacoes: statusReceitas[i] === 'expirada' ? 'Receita expirada - paciente não realizou compra a tempo' :
                    statusReceitas[i] === 'cancelada' ? 'Cancelada a pedido do paciente' : null,
      });
    }

    // Criar todas as receitas
    for (const receitaInfo of receitasParaCriar) {
      try {
        const { data: numeroReceita } = await supabaseAdmin.rpc('gerar_numero_receita');
        
        const { data: receita, error: receitaError } = await supabaseAdmin
          .from('receitas')
          .insert({
            numero_receita: numeroReceita,
            paciente_id: receitaInfo.pacienteId,
            medico_id: receitaInfo.medicoId,
            data_emissao: receitaInfo.dataEmissao,
            validade: receitaInfo.validade,
            status: receitaInfo.status,
            observacoes: receitaInfo.observacoes,
          })
          .select('id, numero_receita, paciente_id, status, data_emissao')
          .single();

        if (receitaError) throw receitaError;
        createdData.receitas++;

        // Criar 2 itens por receita (simplificado)
        const itensReceita = [
          {
            receita_id: receita.id,
            produto_id: produtos[Math.floor(Math.random() * produtos.length)].id,
            posologia: posologias[Math.floor(Math.random() * posologias.length)],
            quantidade_prescrita: Math.floor(Math.random() * 3) + 1,
            duracao_tratamento: duracoes[Math.floor(Math.random() * duracoes.length)],
          },
          {
            receita_id: receita.id,
            produto_id: produtos[Math.floor(Math.random() * produtos.length)].id,
            posologia: posologias[Math.floor(Math.random() * posologias.length)],
            quantidade_prescrita: Math.floor(Math.random() * 3) + 1,
            duracao_tratamento: duracoes[Math.floor(Math.random() * duracoes.length)],
          }
        ];

        const { error: itensError } = await supabaseAdmin
          .from('receita_itens')
          .insert(itensReceita);

        if (!itensError) {
          createdData.receitaItens += 2;
        }

        // Criar pedido se receita utilizada ou 70% de chance se ativa
        if (receita.status === 'utilizada' || (receita.status === 'ativa' && Math.random() > 0.3)) {
          const { data: numeroPedido } = await supabaseAdmin.rpc('gerar_numero_pedido');
          
          const dataPedido = new Date(receita.data_emissao);
          dataPedido.setDate(dataPedido.getDate() + Math.floor(Math.random() * 5) + 1);
          
          const statusPedido = receita.status === 'utilizada' ? 'entregue' : 
                              ['pendente', 'aprovado', 'em_separacao'][Math.floor(Math.random() * 3)];
          
          const valorTotal = (Math.random() * 2000 + 800).toFixed(2);

          const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from('pedidos')
            .insert({
              numero_pedido: numeroPedido,
              paciente_id: receita.paciente_id,
              receita_id: receita.id,
              associacao_marca_id: associacoes[Math.floor(Math.random() * associacoes.length)].id,
              data_pedido: dataPedido.toISOString(),
              status: statusPedido,
              valor_total: valorTotal,
              canal_aquisicao: 'associacao',
              forma_pagamento: 'Pix',
            })
            .select('id')
            .single();

          if (!pedidoError && pedido) {
            createdData.pedidos++;

            // Criar 1 item de pedido
            await supabaseAdmin.from('pedido_itens').insert({
              pedido_id: pedido.id,
              produto_id: produtos[Math.floor(Math.random() * produtos.length)].id,
              quantidade: Math.floor(Math.random() * 2) + 1,
              preco_unitario: parseFloat((parseFloat(valorTotal) / 1.5).toFixed(2)),
              preco_total: valorTotal,
            });
            createdData.pedidoItens++;
          }
        }

      } catch (error: any) {
        errors.push(`Erro: ${error.message}`);
      }
    }

    console.log('Criação de receitas e pedidos concluída!');
    console.log('Resumo:', createdData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Criadas ${createdData.receitas} receitas e ${createdData.pedidos} pedidos com sucesso!`,
        data: createdData,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro ao criar receitas e pedidos',
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
