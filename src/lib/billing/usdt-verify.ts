import { binanceUsdtAddress, usdtHtgRate } from "@/lib/billing/usdt";
import { readEnv } from "@/lib/env";

const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const USDT_DECIMALS = 6;

export type UsdtVerifyResult =
  | { ok: true; amountUsdt: number; toAddress: string }
  | { ok: false; error: string };

function normalizeTronAddress(addr: string): string {
  return addr.trim();
}

function parseNetwork(): string {
  return (readEnv("USDT_NETWORK") || "TRC20").toUpperCase();
}

function expectedUsdtFromHtg(htgAmount: number): number {
  const rate = usdtHtgRate();
  return Math.round((htgAmount / rate) * 100) / 100;
}

function parseEventAmount(raw: unknown): bigint | null {
  if (raw == null) return null;
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

function extractTransferFields(result: Record<string, unknown>): {
  to: string | null;
  amount: bigint | null;
} {
  const to =
    (typeof result.to === "string" && result.to) ||
    (typeof result["1"] === "string" && result["1"]) ||
    null;
  const amount =
    parseEventAmount(result.value) ??
    parseEventAmount(result["2"]) ??
    parseEventAmount(result.amount);
  return { to, amount };
}

async function verifyTrc20Transfer(
  txHash: string,
  expectedAddress: string,
  expectedUsdt: number
): Promise<UsdtVerifyResult> {
  const apiKey = readEnv("TRONGRID_API_KEY");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;

  const res = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}/events`, {
    headers,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: `Transaction introuvable ou non confirmée (${res.status}). Vérifiez le hash TRC20.`,
    };
  }

  const data = (await res.json()) as {
    data?: Array<{
      contract_address?: string;
      event_name?: string;
      result?: Record<string, unknown>;
    }>;
  };

  const events = data.data ?? [];
  const expectedMicro = BigInt(Math.round(expectedUsdt * 10 ** USDT_DECIMALS));
  const tolerance = BigInt(Math.max(1000, Math.round(Number(expectedMicro) * 0.02)));
  const expectedAddr = normalizeTronAddress(expectedAddress);

  for (const ev of events) {
    if (ev.event_name !== "Transfer") continue;
    if (ev.contract_address !== USDT_TRC20_CONTRACT) continue;
    const { to, amount } = extractTransferFields(ev.result ?? {});
    if (!to || amount == null) continue;
    if (normalizeTronAddress(to) !== expectedAddr) continue;

    const amountUsdt = Number(amount) / 10 ** USDT_DECIMALS;

    if (amount + tolerance < expectedMicro) {
      return {
        ok: false,
        error: `Montant insuffisant (${amountUsdt} USDT reçu, ${expectedUsdt} USDT attendu).`,
      };
    }
    if (amount > expectedMicro + tolerance * BigInt(2)) {
      return {
        ok: false,
        error: `Montant anormal (${amountUsdt} USDT reçu, ${expectedUsdt} USDT attendu).`,
      };
    }
    return {
      ok: true,
      amountUsdt,
      toAddress: to,
    };
  }

  return {
    ok: false,
    error:
      "Aucun transfert USDT (TRC20) vers l'adresse Binance configurée dans cette transaction.",
  };
}

/** Vérifie on-chain qu'un txHash correspond au paiement USDT attendu. */
export async function verifyUsdtPayment(input: {
  txHash: string;
  htgAmount: number;
  expectedUsdt?: number;
}): Promise<UsdtVerifyResult> {
  const txHash = input.txHash.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, error: "Hash de transaction invalide (64 caractères hex attendus)." };
  }

  const payAddress = binanceUsdtAddress();
  if (!payAddress) {
    return { ok: false, error: "Adresse USDT Binance non configurée côté serveur." };
  }

  const network = parseNetwork();
  const expectedUsdt =
    input.expectedUsdt != null && input.expectedUsdt > 0
      ? input.expectedUsdt
      : expectedUsdtFromHtg(input.htgAmount);

  if (network === "TRC20" || network === "TRON") {
    return verifyTrc20Transfer(txHash, payAddress, expectedUsdt);
  }

  return {
    ok: false,
    error: `Vérification automatique non supportée pour le réseau ${network}. Utilisez TRC20 ou NOWPayments.`,
  };
}
