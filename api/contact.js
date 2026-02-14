import { readJsonBody } from "./_lib/read-json.js";

async function sendViaResend({ apiKey, from, to, subject, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (res.ok) return;

  let details = "";
  try {
    const json = await res.json();
    details = json?.message || json?.error || JSON.stringify(json);
  } catch {
    try {
      details = await res.text();
    } catch {
      details = "";
    }
  }

  const err = new Error("email_send_failed");
  // @ts-ignore
  err.details = details;
  throw err;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!resendApiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "missing_resend_api_key" }));
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    res.statusCode = e.statusCode || 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: e.message || "invalid_json" }));
  }

  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const type = String(body?.type || "").trim();
  const message = String(body?.message || "").trim();

  if (!name || !phone || !type || !message) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "missing_fields" }));
  }

  const to = String(process.env.CONTACT_TO_EMAIL || "oryx.wood.erbil@gmail.com").trim();
  const from = String(
    process.env.CONTACT_FROM_EMAIL || "Oryx Carpentry <onboarding@resend.dev>"
  ).trim();

  const subject = `Quote request — ${name}`;
  const text = [`Name: ${name}`, `Phone: ${phone}`, `Project Type: ${type}`, "", message].join("\n");

  try {
    await sendViaResend({ apiKey: resendApiKey, from, to, subject, text });
    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: "email_send_failed",
        details: e?.details ? String(e.details).slice(0, 500) : undefined,
      })
    );
  }
}
