/*
 * Cloudflare Pages Function — easter-egg "step solved" counters.
 * Route: /api/egg
 *   GET                 -> read tallies: { step1, step2, step3 }
 *   POST  ?step=1|2|3   -> increment that step (defaults to step1)
 *
 * Requires a KV namespace bound as `EGG_KV` in the Pages project:
 *   Cloudflare dashboard > your Pages project > Settings > Functions >
 *   KV namespace bindings > Add: Variable name = EGG_KV, choose/create a namespace.
 * Without the binding it degrades gracefully (returns nulls + error).
 */
var STEPS = ["step1", "step2", "step3"];

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function readAll(env) {
  var out = {};
  for (var i = 0; i < STEPS.length; i++) {
    out[STEPS[i]] = parseInt((await env.EGG_KV.get(STEPS[i])) || "0", 10);
  }
  return out;
}

export async function onRequestGet({ env }) {
  if (!env.EGG_KV) return json({ step1: null, step2: null, step3: null, error: "KV not bound" });
  return json(await readAll(env));
}

export async function onRequestPost({ env, request }) {
  if (!env.EGG_KV) return json({ ok: false, error: "KV not bound" });
  var step = new URL(request.url).searchParams.get("step") || "1";
  var key = "step" + step;
  if (STEPS.indexOf(key) === -1) return json({ ok: false, error: "bad step" }, 400);
  var n = parseInt((await env.EGG_KV.get(key)) || "0", 10) + 1;
  await env.EGG_KV.put(key, String(n));
  var out = await readAll(env);
  out.ok = true;
  return json(out);
}
