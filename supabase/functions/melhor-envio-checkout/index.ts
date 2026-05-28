// F4: Checkout Melhor Envio — gera etiqueta ME para um pedido.
// Fluxo: /cart → /shipment/checkout → /shipment/generate.
// Admin invoca após aprovar pedido.
//
// POST {
//   pedido_id: string,
//   destinatario: { nome, document, email, phone, address, number, complement?, district, city, state_abbr, postal_code, country_id? }
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Destinatario {
  nome: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
  country_id?: string;
}

interface CheckoutRequest {
  pedido_id: string;
  destinatario: Destinatario;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes({ error: 'method not allowed' }, 405);

  try {
    const body = (await req.json()) as CheckoutRequest;
    if (!body.pedido_id) return jsonRes({ error: 'pedido_id obrigatório' }, 400);
    if (!body.destinatario) return jsonRes({ error: 'destinatario obrigatório' }, 400);

    const token = Deno.env.get('MELHOR_ENVIO_TOKEN');
    if (!token) return jsonRes({ error: 'MELHOR_ENVIO_TOKEN não configurado' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: pedido, error: pedErr } = await sb
      .from('pedidos')
      .select('id, numero_pedido, melhor_envio_servico_id, melhor_envio_order_id, paciente_id, valor_total')
      .eq('id', body.pedido_id)
      .single();
    if (pedErr || !pedido) return jsonRes({ error: 'pedido não encontrado', detail: pedErr?.message }, 404);
    if (!pedido.melhor_envio_servico_id) {
      return jsonRes({ error: 'pedido sem serviço ME definido' }, 400);
    }
    if (pedido.melhor_envio_order_id) {
      return jsonRes({ error: 'etiqueta já gerada', order_id: pedido.melhor_envio_order_id }, 409);
    }

    const { data: itens, error: itErr } = await sb
      .from('pedido_itens')
      .select('quantidade, preco_unitario, produto_id, produtos(id, nome_comercial, peso_g, largura_cm, altura_cm, comprimento_cm, preco_brl, preco)')
      .eq('pedido_id', body.pedido_id);
    if (itErr || !itens || itens.length === 0) {
      return jsonRes({ error: 'itens não encontrados', detail: itErr?.message }, 404);
    }

    const { data: cfg, error: cfgErr } = await sb.rpc('get_melhor_envio_config', { p_associacao_id: null });
    if (cfgErr || !cfg || cfg.length === 0) {
      return jsonRes({ error: 'config ME não encontrada', detail: cfgErr?.message }, 500);
    }
    const { cep_origem, sandbox, remetente } = cfg[0] as {
      cep_origem: string;
      sandbox: boolean;
      remetente: Record<string, string>;
    };
    if (!remetente?.nome || !remetente?.document) {
      return jsonRes({ error: 'remetente incompleto em configuracoes_sistema.melhor_envio_remetente' }, 500);
    }

    const meBase = sandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
    const meHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Canfy/1.0 (contato@canfy.com.br)',
    };

    const meProducts = itens.map((it) => {
      const p = it.produtos as unknown as {
        nome_comercial: string;
        preco_brl: number | null;
        preco: number | null;
      };
      return {
        name: p.nome_comercial,
        quantity: it.quantidade,
        unitary_value: Number(it.preco_unitario ?? p.preco_brl ?? p.preco ?? 0),
      };
    });

    const volumes = itens.map((it) => {
      const p = it.produtos as unknown as {
        peso_g: number;
        largura_cm: number;
        altura_cm: number;
        comprimento_cm: number;
      };
      return {
        height: Number(p.altura_cm),
        width: Number(p.largura_cm),
        length: Number(p.comprimento_cm),
        weight: Number(p.peso_g) / 1000,
      };
    });

    const insuranceValue = itens.reduce((acc, it) => {
      const p = it.produtos as unknown as { preco_brl: number | null; preco: number | null };
      return acc + Number(it.preco_unitario ?? p.preco_brl ?? p.preco ?? 0) * (it.quantidade as number);
    }, 0);

    const cartBody = {
      service: pedido.melhor_envio_servico_id,
      agency: null,
      from: {
        name: remetente.nome,
        phone: remetente.phone ?? '',
        email: remetente.email ?? '',
        document: remetente.document,
        company_document: remetente.company_document ?? undefined,
        postal_code: cep_origem,
        address: remetente.address ?? '',
        number: remetente.number ?? 'S/N',
        complement: remetente.complement ?? undefined,
        district: remetente.district ?? '',
        city: remetente.city ?? '',
        state_abbr: remetente.state_abbr ?? '',
        country_id: 'BR',
      },
      to: {
        name: body.destinatario.nome,
        phone: body.destinatario.phone,
        email: body.destinatario.email,
        document: body.destinatario.document,
        address: body.destinatario.address,
        number: body.destinatario.number,
        complement: body.destinatario.complement ?? undefined,
        district: body.destinatario.district,
        city: body.destinatario.city,
        state_abbr: body.destinatario.state_abbr,
        postal_code: body.destinatario.postal_code.replace(/\D/g, ''),
        country_id: body.destinatario.country_id ?? 'BR',
      },
      products: meProducts,
      volumes,
      options: {
        insurance_value: insuranceValue,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        platform: 'Canfy',
        tags: [{ tag: pedido.numero_pedido, url: null }],
      },
    };

    const cartRes = await fetch(`${meBase}/api/v2/me/cart`, {
      method: 'POST',
      headers: meHeaders,
      body: JSON.stringify(cartBody),
    });
    const cartJson = await cartRes.json();
    if (!cartRes.ok) {
      return jsonRes({ error: 'erro /cart ME', status: cartRes.status, detail: cartJson }, 502);
    }
    const orderId = cartJson.id as string | undefined;
    if (!orderId) return jsonRes({ error: 'order_id não retornado', detail: cartJson }, 502);

    const checkoutRes = await fetch(`${meBase}/api/v2/me/shipment/checkout`, {
      method: 'POST',
      headers: meHeaders,
      body: JSON.stringify({ orders: [orderId] }),
    });
    const checkoutJson = await checkoutRes.json();
    if (!checkoutRes.ok) {
      return jsonRes({
        error: 'erro /shipment/checkout ME',
        status: checkoutRes.status,
        detail: checkoutJson,
        order_id: orderId,
      }, 502);
    }

    const generateRes = await fetch(`${meBase}/api/v2/me/shipment/generate`, {
      method: 'POST',
      headers: meHeaders,
      body: JSON.stringify({ orders: [orderId] }),
    });
    const generateJson = await generateRes.json();
    if (!generateRes.ok) {
      return jsonRes({
        error: 'erro /shipment/generate ME',
        status: generateRes.status,
        detail: generateJson,
        order_id: orderId,
      }, 502);
    }

    const printRes = await fetch(`${meBase}/api/v2/me/shipment/print`, {
      method: 'POST',
      headers: meHeaders,
      body: JSON.stringify({ mode: 'private', orders: [orderId] }),
    });
    const printJson = await printRes.json();
    const etiquetaUrl: string | null = printRes.ok ? (printJson.url ?? null) : null;

    const { error: updErr } = await sb
      .from('pedidos')
      .update({
        melhor_envio_order_id: orderId,
        melhor_envio_etiqueta_url: etiquetaUrl,
        status: 'em_separacao',
      })
      .eq('id', body.pedido_id);
    if (updErr) {
      return jsonRes({
        error: 'etiqueta gerada mas update DB falhou',
        detail: updErr.message,
        order_id: orderId,
        etiqueta_url: etiquetaUrl,
      }, 500);
    }

    return jsonRes({
      order_id: orderId,
      etiqueta_url: etiquetaUrl,
      print_error: printRes.ok ? null : printJson,
    });
  } catch (e) {
    return jsonRes({ error: 'erro interno', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
