import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearSessionCookie, destroySession } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
