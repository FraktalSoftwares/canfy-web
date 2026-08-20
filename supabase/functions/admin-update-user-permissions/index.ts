// Admin: UPSERT permissões de qualquer usuário.
// Auth obrigatório. Caller deve ter permissão de edição no módulo 'acessos'.
// Body: { user_id: string, permissoes: { [modulo: string]: { pode_acessar: boolean; pode_editar: boolean } } }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODULOS_VALIDOS = ['acessos', 'usuarios', 'receitas', 'produtos', 'associacoes'] as const;
type Modulo = typeof MODULOS_VALIDOS[number];

interface PermInput {
  pode_acessar: boolean;
  pode_editar: boolean;
}

interface UpdateBody {
  user_id: string;
  permissoes: Record<string, PermInput>;
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

    const body = (await req.json()) as UpdateBody;
    if (!body?.user_id || typeof body.user_id !== 'string') {
      return jsonRes({ error: 'user_id obrigatório' }, 400);
    }
    if (!body.permissoes || typeof body.permissoes !== 'object') {
      return jsonRes({ error: 'permissoes obrigatório' }, 400);
    }

    const rows: { user_id: string; modulo: Modulo; pode_acessar: boolean; pode_editar: boolean }[] = [];
    for (const [modulo, perm] of Object.entries(body.permissoes)) {
      if (!(MODULOS_VALIDOS as readonly string[]).includes(modulo)) {
        return jsonRes({ error: `módulo inválido: ${modulo}` }, 400);
      }
      rows.push({
        user_id: body.user_id,
        modulo: modulo as Modulo,
        pode_acessar: !!perm.pode_acessar,
        pode_editar: !!perm.pode_editar,
      });
    }

    if (rows.length === 0) return jsonRes({ ok: true, atualizados: 0 });

    const { error: upsertErr } = await sbAdmin
      .from('user_permissions')
      .upsert(rows, { onConflict: 'user_id,modulo' });
    if (upsertErr) return jsonRes({ error: 'upsert failed', detail: upsertErr.message }, 500);

    return jsonRes({ ok: true, atualizados: rows.length });
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
