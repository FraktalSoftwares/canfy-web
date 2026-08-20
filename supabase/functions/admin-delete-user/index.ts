// Admin: soft delete (profiles.ativo=false) ou hard delete (auth.admin.deleteUser).
// Default: soft. Hard via body { hard: true }. Caller deve ter permissão de edição no módulo 'acessos'.
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

    // Autorizacao: exige permissao de edicao no modulo 'acessos'. A funcao SQL
    // has_permission trata super_admin, a linha explicita em user_permissions e,
    // quando nao ha linha configurada, cai no comportamento anterior (role).
    const { data: podeEditar, error: permErr } = await sbAdmin.rpc('has_permission', {
      _user_id: callerId,
      _modulo: 'acessos',
      _acao: 'editar',
    });
    if (permErr) return jsonRes({ error: 'permission check failed', detail: permErr.message }, 500);
    if (!podeEditar) return jsonRes({ error: 'forbidden' }, 403);

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
