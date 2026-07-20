/**
 * Cloudflare Pages Function: POST /api/subscribe
 * Stores emails in a KV namespace bound as SUBSCRIBERS.
 * See README for the one-time KV setup (free tier).
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost({ request, env }) {
  try {
    const { email, company } = await request.json();

    // Honeypot: real users never fill the hidden "company" field.
    if (company) return json({ ok: true });

    const cleaned = (email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(cleaned)) {
      return json({ ok: false, error: 'That email does not look right.' }, 400);
    }

    if (!env.SUBSCRIBERS) {
      return json({ ok: false, error: 'Signups are not wired up yet. Email me instead!' }, 503);
    }

    const existing = await env.SUBSCRIBERS.get(cleaned);
    if (!existing) {
      await env.SUBSCRIBERS.put(
        cleaned,
        JSON.stringify({ subscribedAt: new Date().toISOString() })
      );
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Something jammed the press. Try again?' }, 500);
  }
}
