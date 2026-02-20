import { NextResponse } from "next/server";
import { listPersonaProfiles } from "@/lib/db";
import { PERSONAS } from "@/lib/personas";

export async function GET(_req: Request) {
  const personas = await listPersonaProfiles(Object.values(PERSONAS));
  return NextResponse.json({ personas });
}
