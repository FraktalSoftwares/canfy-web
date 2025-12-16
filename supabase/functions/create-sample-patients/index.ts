import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PatientData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
  endereco: string;
}

const samplePatients: PatientData[] = [
  {
    nome: 'Ana Clara Silva',
    email: 'anaclara.silva@example.com',
    telefone: '(11) 98765-4321',
    cpf: '123.456.789-01',
    dataNascimento: '1991-05-15',
    endereco: 'Rua das Orquídeas, 99, São Paulo/SP - Floresta'
  },
  {
    nome: 'João Pedro Almeida',
    email: 'joao.almeida@example.com',
    telefone: '(21) 97654-3210',
    cpf: '234.567.890-12',
    dataNascimento: '1992-08-22',
    endereco: 'Av. Atlântica, 1500, Rio de Janeiro/RJ - Copacabana'
  },
  {
    nome: 'Fernanda Ribeiro',
    email: 'fernanda.ribeiro@example.com',
    telefone: '(11) 96543-2109',
    cpf: '345.678.901-23',
    dataNascimento: '1993-03-10',
    endereco: 'Rua Augusta, 250, São Paulo/SP - Consolação'
  },
  {
    nome: 'Carlos Martins',
    email: 'carlos.martins@example.com',
    telefone: '(41) 95432-1098',
    cpf: '456.789.012-34',
    dataNascimento: '1994-11-30',
    endereco: 'Rua XV de Novembro, 800, Curitiba/PR - Centro'
  },
  {
    nome: 'Tatiane Lima',
    email: 'tatiane.lima@example.com',
    telefone: '(31) 94321-0987',
    cpf: '567.890.123-45',
    dataNascimento: '1995-07-18',
    endereco: 'Av. Afonso Pena, 1500, Belo Horizonte/MG - Centro'
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Creating sample patients...');

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const createdPatients = [];
    const errors = [];

    for (const patient of samplePatients) {
      try {
        // Create user in auth
        const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: patient.email,
          password: 'SamplePassword123!',
          email_confirm: true,
          user_metadata: {
            nome_completo: patient.nome,
            telefone: patient.telefone
          }
        });

        if (authError) {
          // If user already exists, skip
          if (authError.message.includes('already registered')) {
            console.log(`User ${patient.email} already exists, skipping...`);
            continue;
          }
          throw authError;
        }

        if (!userData.user) {
          throw new Error('User creation failed');
        }

        // Create patient record
        const { error: pacienteError } = await supabaseAdmin
          .from('pacientes')
          .insert({
            user_id: userData.user.id,
            cpf: patient.cpf,
            data_nascimento: patient.dataNascimento,
            endereco_completo: patient.endereco,
            total_consultas: Math.floor(Math.random() * 10) + 1,
            total_pedidos: Math.floor(Math.random() * 8) + 1,
            ultimo_acesso: new Date().toISOString()
          });

        if (pacienteError) {
          console.error('Error creating patient record:', pacienteError);
          errors.push({ email: patient.email, error: pacienteError.message });
        } else {
          createdPatients.push({
            email: patient.email,
            nome: patient.nome,
            id: userData.user.id
          });
        }
      } catch (error) {
        console.error(`Error creating patient ${patient.email}:`, error);
        errors.push({ 
          email: patient.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdPatients.length} patients`,
        created: createdPatients,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in create-sample-patients function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});