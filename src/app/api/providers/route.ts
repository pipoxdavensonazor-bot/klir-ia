import { NextResponse } from "next/server";
import { getPublicProviderStatus } from "@/lib/ai/chat-provider";

export async function GET() {
  return NextResponse.json(getPublicProviderStatus());
}
