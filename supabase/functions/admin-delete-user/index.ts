// Admin: soft delete (profiles.ativo=false) ou hard delete (auth.admin.deleteUser).
// Default: soft. Hard via body { hard: true }. Caller deve ter role admin/super_admin.
// Bloqueia auto-exclusão do caller.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteBody {
  user_id: string;
  hard?: boolean;
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

    const body = (await req.json()) as DeleteBody;
    if (!body?.user_id || typeof body.user_id !== 'string') {
      return jsonRes({ error: 'user_id obrigatório' }, 400);
    }
    if (body.user_id === callerId) {
      return jsonRes({ error: 'não é permitido excluir o próprio usuário' }, 400);
    }

    if (body.hard) {
      const { error: delErr } = await sbAdmin.auth.admin.deleteUser(body.user_id);
      if (delErr) return jsonRes({ error: 'delete failed', detail: delErr.message }, 500);
      return jsonRes({ ok: true, modo: 'hard' });
    }

    const { error: updErr } = await sbAdmin
      .from('profiles')
      .update({ ativo: false })
      .eq('id', body.user_id);
    if (updErr) return jsonRes({ error: 'soft delete failed', detail: updErr.message }, 500);

    return jsonRes({ ok: true, modo: 'soft' });
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
