// F4: Webhook Melhor Envio — recebe atualizações de tracking e status.
// Sem auth: endpoint público.
// Eventos: tracking.updated, order.posted, order.delivered.
// Atualiza pedidos via melhor_envio_order_id.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MeWebhookPayload {
  event: string;
  data?: {
    id?: string;
    tracking?: string;
    status?: string;
    updated_at?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  // Sempre devolve 200 OK — ME exige status válido em test ping e nas chamadas reais.
  if (req.method === 'GET' || req.method === 'HEAD') {
    return jsonRes({ ok: true, message: 'melhor-envio-webhook ativo' });
  }
  if (req.method !== 'POST') return jsonRes({ ok: true, ignored: 'method' });

  let payload: MeWebhookPayload | null = null;
  try {
    const text = await req.text();
    if (text) payload = JSON.parse(text) as MeWebhookPayload;
  } catch {
    return jsonRes({ ok: true, ignored: 'invalid json' });
  }

  const event = payload?.event ?? '';
  const meOrderId = payload?.data?.id;

  // Test ping ou sem order_id: aceita silenciosamente
  if (!meOrderId) return jsonRes({ ok: true, ignored: 'no order id', event });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    const update: Record<string, unknown> = {
      rastreio_atualizado_em: new Date().toISOString(),
    };
    if (payload?.data?.tracking) update.codigo_rastreio = payload.data.tracking;

    if (event === 'order.posted' || event === 'shipment.posted') {
      update.status = 'enviado';
    } else if (event === 'order.delivered' || event === 'shipment.delivered') {
      update.status = 'entregue';
    }

    const { data, error } = await sb
      .from('pedidos')
      .update(update)
      .eq('melhor_envio_order_id', meOrderId)
      .select('id');
    if (error) {
      return jsonRes({ ok: true, db_error: error.message, event });
    }
    if (!data || data.length === 0) {
      return jsonRes({ ok: true, ignored: 'pedido não encontrado', order_id: meOrderId });
    }

    return jsonRes({ ok: true, pedido_id: data[0].id, event });
  } catch (e) {
    return jsonRes({ ok: true, error: e instanceof Error ? e.message : String(e) });
  }
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
