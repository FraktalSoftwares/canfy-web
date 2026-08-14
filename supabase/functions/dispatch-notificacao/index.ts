// Admin: dispara uma notificação por e-mail (canal externo) via Resend.
// A entrega in-app é feita pela inserção em `notificacoes` no cliente; esta função
// cuida apenas do e-mail. Auth obrigatório: caller deve ser admin ou super_admin.
//
// Segredo necessário no projeto Supabase: RESEND_API_KEY
// (opcional) RESEND_FROM — remetente verificado no Resend. Default: naoresponda@fraktalsoftwares.com.br

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type DestinatarioTipo = 'todos' | 'todos_pacientes' | 'todos_medicos' | 'especifico';

interface Payload {
  titulo: string;
  descricao: string;
  destinatario_tipo: DestinatarioTipo;
  destinatario_id?: string; // user_id, obrigatório quando destinatario_tipo = 'especifico'
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
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM') ?? 'Canfy <naoresponda@fraktalsoftwares.com.br>';

    // Autenticação do caller
    const sbUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await sbUser.auth.getUser();
    if (userErr || !userData.user) return jsonRes({ error: 'invalid token' }, 401);
    const callerId = userData.user.id;

    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Checagem de role
    const { data: callerRoles, error: roleErr } = await sbAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);
    if (roleErr) return jsonRes({ error: 'role check failed', detail: roleErr.message }, 500);
    const isAdmin = (callerRoles ?? []).some(
      (r: { role: string }) => r.role === 'admin' || r.role === 'super_admin',
    );
    if (!isAdmin) return jsonRes({ error: 'forbidden' }, 403);

    // Payload
    const body = (await req.json().catch(() => null)) as Payload | null;
    if (!body?.titulo || !body?.descricao || !body?.destinatario_tipo) {
      return jsonRes({ error: 'campos obrigatórios: titulo, descricao, destinatario_tipo' }, 400);
    }

    if (!resendKey) {
      // Sem provedor configurado: não é erro fatal — a entrega in-app já ocorreu no cliente.
      return jsonRes(
        { dispatched: false, reason: 'RESEND_API_KEY não configurado', recipients: 0 },
        200,
      );
    }

    // Resolve os user_ids alvo conforme o destinatário
    let targetIds: string[] = [];
    if (body.destinatario_tipo === 'especifico') {
      if (!body.destinatario_id) return jsonRes({ error: 'destinatario_id obrigatório' }, 400);
      targetIds = [body.destinatario_id];
    } else if (body.destinatario_tipo === 'todos_pacientes') {
      const { data } = await sbAdmin.from('pacientes').select('user_id');
      targetIds = (data ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
    } else if (body.destinatario_tipo === 'todos_medicos') {
      const { data } = await sbAdmin.from('medicos').select('user_id');
      targetIds = (data ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
    } else {
      const { data } = await sbAdmin.from('profiles').select('id').eq('ativo', true);
      targetIds = (data ?? []).map((r: { id: string }) => r.id).filter(Boolean);
    }

    if (targetIds.length === 0) return jsonRes({ dispatched: false, recipients: 0 }, 200);

    // Mapeia user_id -> e-mail via auth admin
    const idSet = new Set(targetIds);
    const emails: string[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error: listErr } = await sbAdmin.auth.admin.listUsers({ page, perPage });
      if (listErr) return jsonRes({ error: 'auth list failed', detail: listErr.message }, 500);
      for (const u of list.users) {
        if (idSet.has(u.id) && u.email) emails.push(u.email);
      }
      if (list.users.length < perPage) break;
      page += 1;
    }

    if (emails.length === 0) return jsonRes({ dispatched: false, recipients: 0 }, 200);

    // Envia via Resend em lotes (usando BCC para preservar privacidade dos destinatários)
    const html = `<div style="font-family:system-ui,sans-serif">
      <h2 style="color:#00994B">${escapeHtml(body.titulo)}</h2>
      <p style="font-size:15px;line-height:1.5">${escapeHtml(body.descricao)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">Você recebeu este e-mail porque é cadastrado na plataforma Canfy.</p>
    </div>`;

    const batchSize = 45; // limite prático de destinatários por chamada no Resend
    let sent = 0;
    const errors: string[] = [];
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: fromEmail,
          bcc: batch,
          subject: body.titulo,
          html,
        }),
      });
      if (resp.ok) {
        sent += batch.length;
      } else {
        errors.push(await resp.text());
      }
    }

    return jsonRes({
      dispatched: sent > 0,
      recipients: sent,
      total: emails.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    return jsonRes({ error: 'internal', detail: (e as Error).message }, 500);
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
