import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(_req: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  if (!supabase) {
    return NextResponse.json({ turns: [] });
  }

  const { sessionId } = await context.params;
  const { data, error } = await supabase
    .from("turns")
    .select("id, persona_id, transcript, response_text, output_audio_url, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ turns: data || [] });
}
