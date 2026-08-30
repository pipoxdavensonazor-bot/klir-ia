import { readEnv } from "@/lib/env";

/** USDT via portefeuille Binance (manuel) ou NOWPayments (legacy). */

export type UsdtInvoice = {
  mode: "binance" | "nowpayments" | "manual";
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  network: string;
  orderRef: string;
  htgAmount: number;
  invoiceUrl?: string;
  paymentId?: string;
  instructions: string[];
};

export function binanceUsdtAddress(): string | null {
  return (
    readEnv("BINANCE_USDT_ADDRESS") ||
    readEnv("USDT_WALLET_ADDRESS") ||
    null
  );
}

export function usdtHtgRate(): number {
  const raw = readEnv("USDT_HTG_RATE");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 130;
}

export function usdtConfigured(): boolean {
  return Boolean(binanceUsdtAddress() || readEnv("NOWPAYMENTS_API_KEY"));
}

export async function createUsdtPayment(input: {
  orderId: string;
  htgAmount: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<UsdtInvoice> {
  const rate = usdtHtgRate();
  const amountUsdt = Math.round((input.htgAmount / rate) * 100) / 100;
  const network = readEnv("USDT_NETWORK") || "TRC20";
  const payCurrency = readEnv("USDT_PAY_CURRENCY") || "USDT";

  const wallet = binanceUsdtAddress();
  if (wallet) {
    return {
      mode: "binance",
      payAddress: wallet,
      payAmount: amountUsdt,
      payCurrency,
      network,
      orderRef: input.orderId,
      htgAmount: input.htgAmount,
      instructions: [
        `Ouvrez Binance → Retrait → USDT (${network}).`,
        `Montant exact : **${amountUsdt} USDT** (≈ ${input.htgAmount} HTG).`,
        `Adresse : collez l'adresse ci-dessous.`,
        `Mémo / note (si disponible) : ${input.orderId}`,
        `Après envoi, soumettez le hash de transaction sur cette page.`,
      ],
    };
  }

  const apiKey = readEnv("NOWPAYMENTS_API_KEY");
  if (apiKey) {
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amountUsdt,
        price_currency: "usd",
        pay_currency: readEnv("USDT_PAY_CURRENCY") || "usdttrc20",
        order_id: input.orderId,
        order_description: `Klir IA — ${input.orderId}`,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        ipn_callback_url: `${readEnv("NEXT_PUBLIC_APP_URL") || "https://klirline.io"}/api/webhooks/nowpayments`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`NOWPayments failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      id?: string | number;
      invoice_url?: string;
      pay_address?: string;
      pay_amount?: number;
      pay_currency?: string;
    };

    return {
      mode: "nowpayments",
      payAddress: data.pay_address || "",
      payAmount: data.pay_amount ?? amountUsdt,
      payCurrency: data.pay_currency ?? "usdttrc20",
      network,
      orderRef: input.orderId,
      htgAmount: input.htgAmount,
      invoiceUrl: data.invoice_url,
      paymentId: data.id != null ? String(data.id) : undefined,
      instructions: ["Payez via la facture NOWPayments."],
    };
  }

  throw new Error(
    "USDT non configuré. Ajoutez BINANCE_USDT_ADDRESS (compte Binance) dans les secrets Worker."
  );
}
