import { NextRequest, NextResponse } from "next/server";
import { captureEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    event?: string;
    sessionId?: string;
    userId?: string;
  };

  if (!body.event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  captureEvent(body.event, {
    sessionId: body.sessionId,
    distinct_id: body.userId || body.sessionId || "anonymous"
  });

  return NextResponse.json({ ok: true });
}
