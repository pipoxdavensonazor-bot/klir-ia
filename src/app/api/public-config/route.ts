import { NextResponse } from "next/server";
import { getCreditPublicConfig } from "@/lib/billing/credit-config";

/** Config publique runtime. */
export async function GET() {
  return NextResponse.json({
    authProvider: "klir",
    authEnabled: true,
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    credits: getCreditPublicConfig(),
  });
}
