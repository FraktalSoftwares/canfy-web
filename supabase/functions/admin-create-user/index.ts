// Admin: cria novo usuário do painel (perfil admin/gestor/visualizador).
// Auth obrigatório. Caller deve ter role admin ou super_admin.
// Body: { nome_completo: string, email: string, role: 'admin' | 'gestor' | 'visualizador', permissoes?: { [modulo: string]: { pode_acessar: boolean; pode_editar: boolean } } }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODULOS_VALIDOS = ['acessos', 'usuarios', 'receitas', 'produtos', 'associacoes'] as const;
type Modulo = typeof MODULOS_VALIDOS[number];

const ROLES_CRIAVEIS = ['admin', 'gestor', 'visualizador'] as const;
type RoleCriavel = typeof ROLES_CRIAVEIS[number];

interface PermInput {
  pode_acessar: boolean;
  pode_editar: boolean;
}

interface CreateBody {
  nome_completo: string;
  email: string;
  role: RoleCriavel;
  permissoes?: Record<string, PermInput>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes({ error: 'method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return jsonRes({ error: 'missing authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const sbUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await sbUser.auth.getUser();
    if (userErr || !userData.user) return jsonRes({ error: 'invalid token' }, 401);
    const callerId = userData.user.id;

    const sbAdmin = createClient(supabaseUrl, serviceKey);

    const { data: callerRoles, error: roleErr } = await sbAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);
    if (roleErr) return jsonRes({ error: 'role check failed', detail: roleErr.message }, 500);

    const isAdmin = (callerRoles ?? []).some(
      (r: { role: string }) => r.role === 'admin' || r.role === 'super_admin',
    );
    if (!isAdmin) return jsonRes({ error: 'forbidden' }, 403);

    const body = (await req.json()) as CreateBody;

    const nomeCompleto = body?.nome_completo?.trim();
    if (!nomeCompleto) return jsonRes({ error: 'nome_completo obrigatório' }, 400);

    const email = body?.email?.trim();
    if (!email) return jsonRes({ error: 'email obrigatório' }, 400);

    if (!(ROLES_CRIAVEIS as readonly string[]).includes(body?.role)) {
      return jsonRes({ error: `role inválido: ${body?.role}` }, 400);
    }
    const role = body.role;

    const permissoes = body.permissoes ?? {};
    const permRows: { modulo: Modulo; pode_acessar: boolean; pode_editar: boolean }[] = [];
    for (const [modulo, perm] of Object.entries(permissoes)) {
      if (!(MODULOS_VALIDOS as readonly string[]).includes(modulo)) {
        return jsonRes({ error: `módulo inválido: ${modulo}` }, 400);
      }
      permRows.push({
        modulo: modulo as Modulo,
        pode_acessar: !!perm.pode_acessar,
        pode_editar: !!perm.pode_editar,
      });
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.canfy.com.br';

    const { data: inviteData, error: inviteErr } = await sbAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { nome_completo: nomeCompleto, tipo_usuario: 'admin' },
        redirectTo: `${appUrl}/redefinir-senha`,
      },
    );

    if (inviteErr) {
      const msg = inviteErr.message.toLowerCase();
      if (msg.includes('already been registered') || msg.includes('already registered')) {
        return jsonRes({ error: 'e-mail já cadastrado' }, 409);
      }
      return jsonRes({ error: 'invite failed', detail: inviteErr.message }, 500);
    }

    const newUserId = inviteData.user?.id;
    if (!newUserId) return jsonRes({ error: 'usuário não criado' }, 500);

    const { error: roleInsertErr } = await sbAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role });
    if (roleInsertErr) {
      return jsonRes({ error: 'role insert failed', detail: roleInsertErr.message }, 500);
    }

    if (permRows.length > 0) {
      const { error: permErr } = await sbAdmin
        .from('user_permissions')
        .insert(permRows.map((p) => ({ ...p, user_id: newUserId })));
      if (permErr) {
        return jsonRes({ error: 'permissoes insert failed', detail: permErr.message }, 500);
      }
    }

    return jsonRes({ ok: true, user_id: newUserId });
  } catch (e) {
    return jsonRes({ error: 'internal', detail: (e as Error).message }, 500);
  }
});

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
