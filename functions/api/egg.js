/*
 * Cloudflare Pages Function — easter-egg "step 1 solved" counter.
 * Route: /api/egg   (GET = read tally, POST = increment)
 *
 * Requires a KV namespace bound as `EGG_KV` in the Pages project:
 *   Cloudflare dashboard > your Pages project > Settings > Functions >
 *   KV namespace bindings > Add: Variable name = EGG_KV, choose/create a namespace.
 * Without the binding it degrades gracefully (returns step1: null).
 */
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

export async function onRequestGet({ env }) {
  if (!env.EGG_KV) return json({ step1: null, error: "KV not bound" });
  var n = parseInt((await env.EGG_KV.get("step1")) || "0", 10);
  return json({ step1: n });
}

export async function onRequestPost({ env }) {
  if (!env.EGG_KV) return json({ ok: false, error: "KV not bound" });
  var n = parseInt((await env.EGG_KV.get("step1")) || "0", 10) + 1;
  await env.EGG_KV.put("step1", String(n));
  return json({ step1: n });
}
