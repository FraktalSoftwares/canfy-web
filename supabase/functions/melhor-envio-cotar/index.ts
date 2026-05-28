// F4: Cotação Melhor Envio (frete nacional)
// POST { cep_destino: string, itens: [{ produto_id: string, quantidade: number }] }
// Retorna [{ id, name, price, delivery_time, company }]

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Item {
  produto_id: string;
  quantidade: number;
}

interface CotarRequest {
  cep_destino: string;
  itens: Item[];
}

interface MeServico {
  id: number;
  name: string;
  price: string | number;
  delivery_time: number;
  company?: { name: string; picture?: string };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return jsonRes({ error: 'method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as CotarRequest;
    const cepDestino = sanitizeCep(body.cep_destino);
    if (!cepDestino) return jsonRes({ error: 'cep_destino inválido' }, 400);
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      return jsonRes({ error: 'itens vazio' }, 400);
    }

    const token = Deno.env.get('MELHOR_ENVIO_TOKEN');
    if (!token) return jsonRes({ error: 'MELHOR_ENVIO_TOKEN não configurado' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: cfg, error: cfgErr } = await sb.rpc('get_melhor_envio_config', { p_associacao_id: null });
    if (cfgErr || !cfg || cfg.length === 0) {
      return jsonRes({ error: 'config ME não encontrada', detail: cfgErr?.message }, 500);
    }
    const { cep_origem, sandbox } = cfg[0] as { cep_origem: string; sandbox: boolean };

    const ids = [...new Set(body.itens.map((i) => i.produto_id))];
    const { data: produtos, error: prodErr } = await sb
      .from('produtos')
      .select('id, peso_g, largura_cm, altura_cm, comprimento_cm, preco_brl, preco')
      .in('id', ids);
    if (prodErr) return jsonRes({ error: 'erro buscando produtos', detail: prodErr.message }, 500);
    if (!produtos || produtos.length === 0) return jsonRes({ error: 'produtos não encontrados' }, 404);

    const prodMap = new Map(produtos.map((p) => [p.id as string, p]));

    const meProducts = body.itens.map((it) => {
      const p = prodMap.get(it.produto_id);
      if (!p) throw new Error(`produto ${it.produto_id} não encontrado`);
      return {
        id: p.id,
        width: Number(p.largura_cm),
        height: Number(p.altura_cm),
        length: Number(p.comprimento_cm),
        weight: Number(p.peso_g) / 1000,
        insurance_value: Number(p.preco_brl ?? p.preco ?? 0),
        quantity: it.quantidade,
      };
    });

    const meBase = sandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
    const meRes = await fetch(`${meBase}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Canfy/1.0 (contato@canfy.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: cep_origem },
        to: { postal_code: cepDestino },
        products: meProducts,
      }),
    });

    const meJson = await meRes.json();
    if (!meRes.ok) {
      return jsonRes({ error: 'erro ME', status: meRes.status, detail: meJson }, 502);
    }

    const servicos = (meJson as MeServico[])
      .filter((s) => !s.error && s.price != null)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        delivery_time: s.delivery_time,
        company: s.company?.name ?? null,
      }));

    return jsonRes({ servicos });
  } catch (e) {
    return jsonRes({ error: 'erro interno', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function sanitizeCep(cep: string | undefined): string | null {
  if (!cep) return null;
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
