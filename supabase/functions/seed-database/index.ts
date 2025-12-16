import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeedResult {
  success: boolean;
  message: string;
  data?: {
    pacientes: number;
    medicos: number;
    associacoes: number;
    receitas: number;
    receitaItens: number;
    pedidos: number;
    pedidoItens: number;
  };
  errors?: string[];
}

// Dados realistas para pacientes
const pacientesData = [
  { nome: "Maria Silva Santos", cpf: "123.456.789-01", dataNascimento: "1985-03-15", cidade: "São Paulo", estado: "SP", telefone: "(11) 98765-4321" },
  { nome: "João Pedro Oliveira", cpf: "234.567.890-12", dataNascimento: "1990-07-22", cidade: "Rio de Janeiro", estado: "RJ", telefone: "(21) 97654-3210" },
  { nome: "Ana Carolina Souza", cpf: "345.678.901-23", dataNascimento: "1978-11-30", cidade: "Belo Horizonte", estado: "MG", telefone: "(31) 96543-2109" },
  { nome: "Carlos Eduardo Lima", cpf: "456.789.012-34", dataNascimento: "1992-05-18", cidade: "Curitiba", estado: "PR", telefone: "(41) 95432-1098" },
  { nome: "Juliana Ferreira Costa", cpf: "567.890.123-45", dataNascimento: "1988-09-25", cidade: "Porto Alegre", estado: "RS", telefone: "(51) 94321-0987" },
  { nome: "Ricardo Alves Pereira", cpf: "678.901.234-56", dataNascimento: "1975-12-08", cidade: "Salvador", estado: "BA", telefone: "(71) 93210-9876" },
  { nome: "Fernanda Rodrigues", cpf: "789.012.345-67", dataNascimento: "1995-02-14", cidade: "Brasília", estado: "DF", telefone: "(61) 92109-8765" },
  { nome: "Paulo Henrique Martins", cpf: "890.123.456-78", dataNascimento: "1982-08-07", cidade: "Recife", estado: "PE", telefone: "(81) 91098-7654" },
  { nome: "Camila Dias Barbosa", cpf: "901.234.567-89", dataNascimento: "1991-04-20", cidade: "Fortaleza", estado: "CE", telefone: "(85) 90987-6543" },
  { nome: "Bruno Santos Araújo", cpf: "012.345.678-90", dataNascimento: "1987-10-12", cidade: "Manaus", estado: "AM", telefone: "(92) 89876-5432" },
  { nome: "Patrícia Mendes Silva", cpf: "123.456.780-01", dataNascimento: "1993-06-28", cidade: "Goiânia", estado: "GO", telefone: "(62) 88765-4321" },
  { nome: "Rafael Costa Nunes", cpf: "234.567.801-12", dataNascimento: "1980-01-05", cidade: "Belém", estado: "PA", telefone: "(91) 87654-3210" },
  { nome: "Larissa Almeida Rocha", cpf: "345.678.012-23", dataNascimento: "1989-11-17", cidade: "Florianópolis", estado: "SC", telefone: "(48) 86543-2109" },
  { nome: "Thiago Ribeiro Campos", cpf: "456.789.123-34", dataNascimento: "1994-03-09", cidade: "Natal", estado: "RN", telefone: "(84) 85432-1098" },
  { nome: "Gabriela Santos Lima", cpf: "567.890.234-45", dataNascimento: "1986-07-31", cidade: "João Pessoa", estado: "PB", telefone: "(83) 84321-0987" },
  { nome: "Rodrigo Oliveira Pinto", cpf: "678.901.345-56", dataNascimento: "1996-12-23", cidade: "Aracaju", estado: "SE", telefone: "(79) 83210-9876" },
  { nome: "Mariana Cardoso Freitas", cpf: "789.012.456-67", dataNascimento: "1984-05-16", cidade: "Maceió", estado: "AL", telefone: "(82) 82109-8765" },
  { nome: "Felipe Sousa Moreira", cpf: "890.123.567-78", dataNascimento: "1991-09-04", cidade: "Teresina", estado: "PI", telefone: "(86) 81098-7654" },
  { nome: "Amanda Ferreira Santos", cpf: "901.234.678-89", dataNascimento: "1983-02-27", cidade: "São Luís", estado: "MA", telefone: "(98) 80987-6543" },
  { nome: "Leonardo Silva Carvalho", cpf: "012.345.789-00", dataNascimento: "1997-08-11", cidade: "Campo Grande", estado: "MS", telefone: "(67) 79876-5432" },
];

// Dados realistas para médicos
const medicosData = [
  { nome: "Dr. Roberto Carlos Mendes", crm: "123456", ufCrm: "SP", email: "roberto.mendes@email.com", telefone: "(11) 3456-7890", status: "ativo" },
  { nome: "Dra. Helena Maria Costa", crm: "234567", ufCrm: "RJ", email: "helena.costa@email.com", telefone: "(21) 3567-8901", status: "ativo" },
  { nome: "Dr. André Luiz Pereira", crm: "345678", ufCrm: "MG", email: "andre.pereira@email.com", telefone: "(31) 3678-9012", status: "ativo" },
  { nome: "Dra. Beatriz Alves Santos", crm: "456789", ufCrm: "PR", email: "beatriz.santos@email.com", telefone: "(41) 3789-0123", status: "ativo" },
  { nome: "Dr. Marcelo Silva Oliveira", crm: "567890", ufCrm: "RS", email: "marcelo.oliveira@email.com", telefone: "(51) 3890-1234", status: "ativo" },
  { nome: "Dra. Carolina Dias Ferreira", crm: "678901", ufCrm: "BA", email: "carolina.ferreira@email.com", telefone: "(71) 3901-2345", status: "ativo" },
  { nome: "Dr. Fernando José Ribeiro", crm: "789012", ufCrm: "PE", email: "fernando.ribeiro@email.com", telefone: "(81) 3012-3456", status: "ativo" },
  { nome: "Dra. Vanessa Lima Souza", crm: "890123", ufCrm: "CE", email: "vanessa.souza@email.com", telefone: "(85) 3123-4567", status: "pendente_aprovacao" },
  { nome: "Dr. Gustavo Henrique Martins", crm: "901234", ufCrm: "DF", email: "gustavo.martins@email.com", telefone: "(61) 3234-5678", status: "pendente_aprovacao" },
  { nome: "Dra. Luciana Rodrigues Almeida", crm: "012345", ufCrm: "SC", email: "luciana.almeida@email.com", telefone: "(48) 3345-6789", status: "inativo" },
];

// Dados para associações e marcas
const associacoesData = [
  { nome: "Associação Brasileira de Pacientes de Cannabis Medicinal", tipo: "associacao", cnpj: "12.345.678/0001-90", email: "contato@abpcm.org.br", telefone: "(11) 4000-1000", regiao: "Sudeste", cidade: "São Paulo", estado: "SP", endereco: "Av. Paulista, 1000 - Bela Vista" },
  { nome: "Associação de Apoio à Pesquisa e Pacientes de Cannabis", tipo: "associacao", cnpj: "23.456.789/0001-01", email: "info@apepcann.org.br", telefone: "(21) 4000-2000", regiao: "Sudeste", cidade: "Rio de Janeiro", estado: "RJ", endereco: "Rua das Laranjeiras, 500 - Laranjeiras" },
  { nome: "Associação Medicinal do Sul", tipo: "associacao", cnpj: "34.567.890/0001-12", email: "contato@amsul.org.br", telefone: "(41) 4000-3000", regiao: "Sul", cidade: "Curitiba", estado: "PR", endereco: "Rua XV de Novembro, 300 - Centro" },
  { nome: "Associação de Pacientes Nordeste Cannabis", tipo: "associacao", cnpj: "45.678.901/0001-23", email: "contato@apnc.org.br", telefone: "(71) 4000-4000", regiao: "Nordeste", cidade: "Salvador", estado: "BA", endereco: "Av. Sete de Setembro, 200 - Vitória" },
  { nome: "Green Hope Pharma", tipo: "marca", cnpj: "56.789.012/0001-34", email: "comercial@greenhope.com.br", telefone: "(11) 3500-5000", regiao: "Sudeste", cidade: "São Paulo", estado: "SP", endereco: "Rua dos Bandeirantes, 800 - Vila Olímpia" },
  { nome: "BioCanabis Brasil", tipo: "marca", cnpj: "67.890.123/0001-45", email: "vendas@biocannabis.com.br", telefone: "(31) 3500-6000", regiao: "Sudeste", cidade: "Belo Horizonte", estado: "MG", endereco: "Av. Afonso Pena, 1500 - Centro" },
  { nome: "Cannativa Farmacêutica", tipo: "marca", cnpj: "78.901.234/0001-56", email: "atendimento@cannativa.com.br", telefone: "(51) 3500-7000", regiao: "Sul", cidade: "Porto Alegre", estado: "RS", endereco: "Rua dos Andradas, 1000 - Centro Histórico" },
  { nome: "VitaCann Medicamentos", tipo: "marca", cnpj: "89.012.345/0001-67", email: "contato@vitacann.com.br", telefone: "(61) 3500-8000", regiao: "Centro-Oeste", cidade: "Brasília", estado: "DF", endereco: "SAUS Quadra 3 - Asa Sul" },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando população do banco de dados...');

    const createdData = {
      pacientes: 0,
      medicos: 0,
      associacoes: 0,
      receitas: 0,
      receitaItens: 0,
      pedidos: 0,
      pedidoItens: 0,
    };
    const errors: string[] = [];

    // 1. Criar Pacientes
    console.log('Criando pacientes...');
    const pacienteIds: string[] = [];
    for (const paciente of pacientesData) {
      try {
        const password = 'Senha123!';
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: `${paciente.cpf.replace(/\D/g, '')}@paciente.com`,
          password: password,
          email_confirm: true,
          user_metadata: {
            nome_completo: paciente.nome,
            telefone: paciente.telefone,
            tipo_usuario: 'paciente'
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`Usuário já existe para ${paciente.nome}, pulando...`);
            continue;
          }
          throw authError;
        }

        if (authUser?.user) {
          const { error: pacienteError } = await supabaseAdmin
            .from('pacientes')
            .insert({
              user_id: authUser.user.id,
              cpf: paciente.cpf,
              data_nascimento: paciente.dataNascimento,
              endereco_completo: `${paciente.cidade}, ${paciente.estado}`,
              total_consultas: Math.floor(Math.random() * 15) + 1,
              total_pedidos: Math.floor(Math.random() * 10) + 1,
              ultimo_acesso: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (pacienteError) throw pacienteError;

          pacienteIds.push(authUser.user.id);
          createdData.pacientes++;
          console.log(`Paciente criado: ${paciente.nome}`);
        }
      } catch (error: any) {
        console.error(`Erro ao criar paciente ${paciente.nome}:`, error.message);
        errors.push(`Paciente ${paciente.nome}: ${error.message}`);
      }
    }

    // 2. Criar Médicos
    console.log('Criando médicos...');
    const medicoIds: string[] = [];
    for (const medico of medicosData) {
      try {
        const password = 'Medico123!';
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: medico.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            nome_completo: medico.nome,
            telefone: medico.telefone,
            tipo_usuario: 'medico'
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`Médico já existe: ${medico.nome}, pulando...`);
            continue;
          }
          throw authError;
        }

        if (authUser?.user) {
          const { data: medicoData, error: medicoError } = await supabaseAdmin
            .from('medicos')
            .insert({
              user_id: authUser.user.id,
              nome: medico.nome,
              email: medico.email,
              telefone: medico.telefone,
              crm: medico.crm,
              uf_crm: medico.ufCrm,
              status: medico.status,
              total_atendimentos: Math.floor(Math.random() * 50),
              ultimo_acesso: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select('id')
            .single();

          if (medicoError) throw medicoError;

          if (medicoData && medico.status === 'ativo') {
            medicoIds.push(medicoData.id);
          }
          createdData.medicos++;
          console.log(`Médico criado: ${medico.nome}`);
        }
      } catch (error: any) {
        console.error(`Erro ao criar médico ${medico.nome}:`, error.message);
        errors.push(`Médico ${medico.nome}: ${error.message}`);
      }
    }

    // 3. Criar Associações e Marcas
    console.log('Criando associações e marcas...');
    const associacaoIds: string[] = [];
    for (const assoc of associacoesData) {
      try {
        const { data: assocData, error: assocError } = await supabaseAdmin
          .from('associacoes_marcas')
          .insert({
            nome: assoc.nome,
            tipo: assoc.tipo,
            cnpj: assoc.cnpj,
            email: assoc.email,
            telefone: assoc.telefone,
            regiao: assoc.regiao,
            cidade: assoc.cidade,
            estado: assoc.estado,
            endereco: assoc.endereco,
            status: 'ativo',
          })
          .select('id')
          .single();

        if (assocError) {
          if (assocError.message.includes('duplicate')) {
            console.log(`Associação já existe: ${assoc.nome}, pulando...`);
            continue;
          }
          throw assocError;
        }

        if (assocData) {
          associacaoIds.push(assocData.id);
          createdData.associacoes++;
          console.log(`${assoc.tipo === 'associacao' ? 'Associação' : 'Marca'} criada: ${assoc.nome}`);
        }
      } catch (error: any) {
        console.error(`Erro ao criar ${assoc.tipo} ${assoc.nome}:`, error.message);
        errors.push(`${assoc.tipo} ${assoc.nome}: ${error.message}`);
      }
    }

    // 4. Verificar produtos existentes
    console.log('Verificando produtos existentes...');
    const { data: produtos, error: produtosError } = await supabaseAdmin
      .from('produtos')
      .select('id')
      .eq('status', 'ativo')
      .limit(10);

    if (produtosError) {
      throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    }

    if (!produtos || produtos.length === 0) {
      throw new Error('Nenhum produto ativo encontrado. Por favor, crie produtos antes de executar o seed.');
    }

    console.log(`${produtos.length} produtos ativos encontrados`);

    // 5. Criar Receitas (5 em setembro, 5 em outubro)
    console.log('Criando receitas...');
    const receitaDatas = [
      '2024-09-05', '2024-09-12', '2024-09-18', '2024-09-23', '2024-09-28',
      '2024-10-03', '2024-10-10', '2024-10-15', '2024-10-20', '2024-10-22',
    ];
    const statusReceitas = ['ativa', 'ativa', 'ativa', 'ativa', 'ativa', 'ativa', 'utilizada', 'utilizada', 'expirada', 'cancelada'];
    
    const receitaIds: { id: string, pacienteId: string, data: string }[] = [];

    for (let i = 0; i < 10; i++) {
      try {
        if (pacienteIds.length === 0 || medicoIds.length === 0) {
          console.log('Sem pacientes ou médicos disponíveis para criar receitas');
          break;
        }

        // Buscar paciente_id do paciente
        const userIdPaciente = pacienteIds[Math.floor(Math.random() * pacienteIds.length)];
        const { data: pacienteData } = await supabaseAdmin
          .from('pacientes')
          .select('id')
          .eq('user_id', userIdPaciente)
          .single();

        if (!pacienteData) {
          console.log('Paciente não encontrado, pulando receita...');
          continue;
        }

        const dataEmissao = new Date(receitaDatas[i]);
        const validade = new Date(dataEmissao);
        validade.setDate(validade.getDate() + 90);

        // Gerar número da receita usando a função do banco
        const { data: numeroReceitaData, error: numeroError } = await supabaseAdmin
          .rpc('gerar_numero_receita');

        if (numeroError) throw numeroError;

        const { data: receitaData, error: receitaError } = await supabaseAdmin
          .from('receitas')
          .insert({
            numero_receita: numeroReceitaData,
            paciente_id: pacienteData.id,
            medico_id: medicoIds[Math.floor(Math.random() * medicoIds.length)],
            data_emissao: dataEmissao.toISOString(),
            validade: validade.toISOString().split('T')[0],
            status: statusReceitas[i],
            observacoes: i === 8 ? 'Receita expirada - paciente não realizou compra a tempo' : 
                        i === 9 ? 'Cancelada a pedido do paciente' : null,
          })
          .select('id, numero_receita')
          .single();

        if (receitaError) throw receitaError;

        if (receitaData) {
          receitaIds.push({ 
            id: receitaData.id, 
            pacienteId: pacienteData.id,
            data: receitaDatas[i]
          });
          createdData.receitas++;
          console.log(`Receita criada: ${receitaData.numero_receita}`);

          // 6. Criar itens da receita (1-3 produtos por receita)
          const numItens = Math.floor(Math.random() * 3) + 1;
          const posologias = [
            '1 gota sublingual 2x ao dia',
            '2 gotas sublinguais 3x ao dia',
            '3 gotas sublinguais antes de dormir',
            '1 cápsula pela manhã',
            '2 cápsulas ao dia (manhã e noite)',
            '1 aplicação tópica 2x ao dia',
          ];
          const duracoes = ['30 dias', '60 dias', '90 dias'];

          for (let j = 0; j < numItens; j++) {
            try {
              const { error: itemError } = await supabaseAdmin
                .from('receita_itens')
                .insert({
                  receita_id: receitaData.id,
                  produto_id: produtos[Math.floor(Math.random() * produtos.length)].id,
                  posologia: posologias[Math.floor(Math.random() * posologias.length)],
                  quantidade_prescrita: Math.floor(Math.random() * 5) + 1,
                  duracao_tratamento: duracoes[Math.floor(Math.random() * duracoes.length)],
                });

              if (itemError) throw itemError;
              createdData.receitaItens++;
            } catch (error: any) {
              console.error(`Erro ao criar item de receita:`, error.message);
              errors.push(`Item de receita: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Erro ao criar receita ${i + 1}:`, error.message);
        errors.push(`Receita ${i + 1}: ${error.message}`);
      }
    }

    // 7. Criar Pedidos (8-12 pedidos baseados nas receitas)
    console.log('Criando pedidos...');
    const numPedidos = Math.floor(Math.random() * 5) + 8; // 8 a 12 pedidos
    const statusPedidos = ['pendente', 'aprovado', 'em_separacao', 'entregue', 'entregue', 'entregue', 'cancelado'];
    const canaisAquisicao = ['associacao', 'associacao', 'associacao', 'farmacia'];

    for (let i = 0; i < Math.min(numPedidos, receitaIds.length); i++) {
      try {
        if (associacaoIds.length === 0) {
          console.log('Sem associações disponíveis para criar pedidos');
          break;
        }

        const receita = receitaIds[i];
        const dataPedido = new Date(receita.data);
        dataPedido.setDate(dataPedido.getDate() + Math.floor(Math.random() * 5) + 1);

        const valorTotal = (Math.random() * 2500 + 500).toFixed(2);
        const status = statusPedidos[Math.floor(Math.random() * statusPedidos.length)];
        const canal = canaisAquisicao[Math.floor(Math.random() * canaisAquisicao.length)];

        // Gerar número do pedido usando a função do banco
        const { data: numeroPedidoData, error: numeroPedidoError } = await supabaseAdmin
          .rpc('gerar_numero_pedido');

        if (numeroPedidoError) throw numeroPedidoError;

        const { data: pedidoData, error: pedidoError } = await supabaseAdmin
          .from('pedidos')
          .insert({
            numero_pedido: numeroPedidoData,
            paciente_id: receita.pacienteId,
            receita_id: receita.id,
            associacao_marca_id: associacaoIds[Math.floor(Math.random() * associacaoIds.length)],
            data_pedido: dataPedido.toISOString(),
            status: status,
            valor_total: valorTotal,
            canal_aquisicao: canal,
            forma_pagamento: canal === 'farmacia' ? 'Cartão de Crédito' : 'Pix',
          })
          .select('id, numero_pedido')
          .single();

        if (pedidoError) throw pedidoError;

        if (pedidoData) {
          createdData.pedidos++;
          console.log(`Pedido criado: ${pedidoData.numero_pedido}`);

          // 8. Criar itens do pedido
          const numItensPedido = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numItensPedido; j++) {
            try {
              const quantidade = Math.floor(Math.random() * 3) + 1;
              const precoUnitario = (Math.random() * 1200 + 300).toFixed(2);
              const precoTotal = (parseFloat(precoUnitario) * quantidade).toFixed(2);

              const { error: itemPedidoError } = await supabaseAdmin
                .from('pedido_itens')
                .insert({
                  pedido_id: pedidoData.id,
                  produto_id: produtos[Math.floor(Math.random() * produtos.length)].id,
                  quantidade: quantidade,
                  preco_unitario: precoUnitario,
                  preco_total: precoTotal,
                });

              if (itemPedidoError) throw itemPedidoError;
              createdData.pedidoItens++;
            } catch (error: any) {
              console.error(`Erro ao criar item de pedido:`, error.message);
              errors.push(`Item de pedido: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Erro ao criar pedido ${i + 1}:`, error.message);
        errors.push(`Pedido ${i + 1}: ${error.message}`);
      }
    }

    console.log('População do banco de dados concluída!');
    console.log('Resumo:', createdData);

    const result: SeedResult = {
      success: true,
      message: 'Banco de dados populado com sucesso!',
      data: createdData,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro ao popular banco de dados',
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
