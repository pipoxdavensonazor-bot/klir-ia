import { readEnv } from "@/lib/env";

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function moncashConfigured(): boolean {
  return Boolean(readEnv("MONCASH_CLIENT_ID") && readEnv("MONCASH_CLIENT_SECRET"));
}

function restApi(): string {
  const sandbox = readEnv("MONCASH_SANDBOX") !== "false";
  return sandbox
    ? "https://sandbox.moncashbutton.digicelgroup.com/Api"
    : "https://moncashbutton.digicelgroup.com/Api";
}

function gatewayBase(): string {
  const sandbox = readEnv("MONCASH_SANDBOX") !== "false";
  return sandbox
    ? "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware"
    : "https://moncashbutton.digicelgroup.com/Moncash-middleware";
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = readEnv("MONCASH_CLIENT_ID");
  const clientSecret = readEnv("MONCASH_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${restApi()}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials&scope=read,write",
  });

  if (!res.ok) {
    throw new Error(`MonCash auth failed (${res.status})`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };
  return data.access_token;
}

export async function createMonCashPayment(orderId: string, amountHtg: number): Promise<{ redirectUrl: string }> {
  const token = await getAccessToken();
  const amount = Math.round(amountHtg);

  const res = await fetch(`${restApi()}/v1/CreatePayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ orderId, amount }),
  });

  const raw = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`MonCash CreatePayment failed (${res.status})`);
  }

  const paymentToken =
    (raw.payment_token as { token?: string } | undefined)?.token ??
    (typeof raw.token === "string" ? raw.token : undefined);

  const redirectUrl =
    (typeof raw.redirect_url === "string" && raw.redirect_url) ||
    (paymentToken ? `${gatewayBase()}/Payment/Redirect?token=${paymentToken}` : "");

  if (!redirectUrl) throw new Error("MonCash: pas d’URL de redirection");
  return { redirectUrl };
}

export async function retrieveMonCashOrder(orderId: string): Promise<{
  status: "SUCCESSFUL" | "PENDING" | "FAILED" | "UNKNOWN";
  transactionId?: string;
}> {
  const token = await getAccessToken();
  const res = await fetch(`${restApi()}/v1/RetrieveOrderPayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ orderId }),
  });

  const raw = (await res.json()) as Record<string, unknown>;
  const payment = (raw.payment as Record<string, unknown>) ?? raw;
  const message = String(payment.message ?? payment.status ?? raw.message ?? "").toUpperCase();

  let status: "SUCCESSFUL" | "PENDING" | "FAILED" | "UNKNOWN" = "UNKNOWN";
  if (message.includes("SUCCESS") || message.includes("COMPLETED") || message.includes("APPROVED")) {
    status = "SUCCESSFUL";
  } else if (message.includes("PENDING") || message.includes("PROCESS")) {
    status = "PENDING";
  } else if (!res.ok || message.includes("FAIL") || message.includes("ERROR")) {
    status = "FAILED";
  }

  return {
    status,
    transactionId: String(payment.transaction_id ?? payment.transactionId ?? "") || undefined,
  };
}
