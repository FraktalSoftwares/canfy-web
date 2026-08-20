import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/** Extrai envelopeId e status do payload DocuSign Connect (JSON ou XML simplificado). */
function parseDocuSignPayload(body: string): { envelopeId?: string; status?: string } {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const envelopeId =
      (data.envelopeId as string) ??
      (data.EnvelopeId as string) ??
      (data.envelopeSummary as Record<string, unknown>)?.envelopeId as string | undefined;
    const status =
      (data.status as string) ??
      (data.Status as string) ??
      (data.envelopeSummary as Record<string, unknown>)?.status as string | undefined;
    return { envelopeId, status };
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.text();
    const { envelopeId, status } = parseDocuSignPayload(body);

    if (!envelopeId) {
      console.warn("docusign-webhook: missing envelopeId in payload");
      return jsonResponse({ received: true }, 200);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const statusLower = (status ?? "").toLowerCase();
    const statusMap: Record<string, "sent" | "completed" | "declined" | "voided"> = {
      sent: "sent",
      completed: "completed",
      declined: "declined",
      voided: "voided",
    };
    const mappedStatus = statusMap[statusLower] ?? (!statusLower || statusLower === "completed" ? "completed" : "sent");
    const completedAt = mappedStatus === "completed" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("docusign_envelopes")
      .update({
        status: mappedStatus,
        completed_at: completedAt,
      })
      .eq("envelope_id", envelopeId);

    if (error) {
      console.error("docusign-webhook update error", envelopeId, error);
    }

    return jsonResponse({ received: true, envelopeId, status: statusLower }, 200);
  } catch (e) {
    console.error("docusign-webhook error", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
