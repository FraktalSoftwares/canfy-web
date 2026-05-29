// Admin: lista profiles ativos + email real de auth.users.
// Auth obrigatório. Caller deve ter role admin ou super_admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface UsuarioOut {
  id: string;
  nome_completo: string;
  email: string;
  foto_perfil_url: string | null;
  ativo: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    const { data: profiles, error: profErr } = await sbAdmin
      .from('profiles')
      .select('id, nome_completo, foto_perfil_url, ativo')
      .eq('ativo', true);
    if (profErr) return jsonRes({ error: 'profiles fetch failed', detail: profErr.message }, 500);

    const ids = (profiles ?? []).map((p) => p.id as string);
    const emailMap = new Map<string, string>();

    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error: listErr } = await sbAdmin.auth.admin.listUsers({ page, perPage });
      if (listErr) return jsonRes({ error: 'auth list failed', detail: listErr.message }, 500);
      for (const u of list.users) {
        if (ids.includes(u.id) && u.email) emailMap.set(u.id, u.email);
      }
      if (list.users.length < perPage) break;
      page += 1;
    }

    const out: UsuarioOut[] = (profiles ?? []).map((p) => ({
      id: p.id as string,
      nome_completo: (p.nome_completo as string) ?? '',
      email: emailMap.get(p.id as string) ?? '',
      foto_perfil_url: (p.foto_perfil_url as string | null) ?? null,
      ativo: !!p.ativo,
    }));

    return jsonRes({ usuarios: out });
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
