import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProviderCheck = {
  status: "ok" | "error" | "missing_config";
  latencyMs?: number;
  detail?: string;
};

function compactErrorDetail(input: string): string {
  if (!input) return "unknown_error";
  const trimmed = input.trim();
  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
    return "Received HTML instead of Supabase API JSON. Check SUPABASE_URL; it must look like https://<project-ref>.supabase.co";
  }
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}...` : trimmed;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

async function checkOpenRouter(): Promise<ProviderCheck> {
  const key = process.env.OPENROUTER_API_KEY;
  const base = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  if (!key) return { status: "missing_config", detail: "OPENROUTER_API_KEY missing" };

  const start = Date.now();
  try {
    const res = await withTimeout(
      fetch(`${base}/models`, {
        headers: {
          Authorization: `Bearer ${key}`
        }
      }),
      5000
    );

    if (!res.ok) {
      return { status: "error", latencyMs: Date.now() - start, detail: `http_${res.status}` };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return { status: "error", latencyMs: Date.now() - start, detail: String(error) };
  }
}

async function checkElevenLabs(): Promise<ProviderCheck> {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key) return { status: "missing_config", detail: "ELEVENLABS_API_KEY missing" };

  const start = Date.now();
  try {
    const endpoint = voiceId
      ? `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`
      : "https://api.elevenlabs.io/v1/voices";
    const res = await withTimeout(
      fetch(endpoint, {
        headers: {
          "xi-api-key": key
        }
      }),
      5000
    );

    if (!res.ok) {
      return { status: "error", latencyMs: Date.now() - start, detail: `http_${res.status}` };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return { status: "error", latencyMs: Date.now() - start, detail: String(error) };
  }
}

async function checkSupabase(): Promise<ProviderCheck> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { status: "missing_config", detail: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, key);
    const query = supabase.from("sessions").select("id").limit(1);
    const { error } = await withTimeout(query, 5000);

    if (error) {
      return { status: "error", latencyMs: Date.now() - start, detail: compactErrorDetail(error.message) };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return { status: "error", latencyMs: Date.now() - start, detail: compactErrorDetail(String(error)) };
  }
}

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHtml(payload: {
  status: "ok" | "partial" | "degraded";
  timestamp: string;
  checks: Record<string, ProviderCheck>;
}): string {
  const cards = Object.entries(payload.checks)
    .map(([name, check]) => {
      const color =
        check.status === "ok" ? "#0f766e" : check.status === "missing_config" ? "#b45309" : "#b91c1c";
      const bg = check.status === "ok" ? "#ccfbf1" : check.status === "missing_config" ? "#fef3c7" : "#fee2e2";
      return `
        <section style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <h2 style="margin:0;font-size:18px;text-transform:capitalize;">${escapeHtml(name)}</h2>
            <span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:${bg};color:${color};">${escapeHtml(check.status)}</span>
          </div>
          <p style="margin:10px 0 0;color:#334155;font-size:14px;">Latency: ${check.latencyMs ?? "n/a"} ms</p>
          <p style="margin:6px 0 0;color:#475569;font-size:13px;word-break:break-word;">Detail: ${escapeHtml(check.detail || "none")}</p>
        </section>
      `;
    })
    .join("");

  const overallColor = payload.status === "ok" ? "#0f766e" : payload.status === "partial" ? "#b45309" : "#b91c1c";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Provider Health</title>
  </head>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <main style="max-width:900px;margin:0 auto;padding:28px 16px 40px;">
      <header style="margin-bottom:18px;">
        <h1 style="margin:0;font-size:28px;">Provider Health</h1>
        <p style="margin:8px 0 0;color:#475569;">Timestamp: ${escapeHtml(payload.timestamp)}</p>
        <p style="margin:6px 0 0;font-weight:700;color:${overallColor};">Overall status: ${escapeHtml(payload.status)}</p>
      </header>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
        ${cards}
      </div>
      <p style="margin-top:16px;color:#64748b;font-size:12px;">Tip: add <code>?format=json</code> for raw JSON.</p>
    </main>
  </body>
</html>`;
}

export async function GET(req: Request) {
  const [openrouter, elevenlabs, supabase] = await Promise.all([
    checkOpenRouter(),
    checkElevenLabs(),
    checkSupabase()
  ]);

  const checks = { openrouter, elevenlabs, supabase };
  const hasError = Object.values(checks).some((c) => c.status === "error");
  const hasMissing = Object.values(checks).some((c) => c.status === "missing_config");

  const payload = {
    status: hasError ? "degraded" : hasMissing ? "partial" : "ok",
    timestamp: new Date().toISOString(),
    checks
  } as const;
  const statusCode = hasError ? 503 : 200;

  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const acceptsHtml = req.headers.get("accept")?.includes("text/html");
  const wantsHtml = format === "html" || (acceptsHtml && format !== "json");

  if (wantsHtml) {
    return new NextResponse(renderHtml(payload), {
      status: statusCode,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  return NextResponse.json(payload, { status: statusCode });
}
