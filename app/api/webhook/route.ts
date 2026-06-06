import { NextRequest, NextResponse } from "next/server";
import { validateAlert, parseAlert } from "@/lib/alertParser";
import { executeTrade } from "@/lib/tradeExecutor";
import { logTrade } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let body: string;
    if (contentType.includes("application/json")) {
      const json = await req.json();
      body = JSON.stringify(json);
    } else {
      body = await req.text();
    }

    const alert = parseAlert(body);
    if (!validateAlert(alert)) {
      return NextResponse.json({ error: "Invalid alert format" }, { status: 400 });
    }

    console.log(`[WEBHOOK] Received ${alert.direction} signal on ${alert.ticker}`);

    const result = await executeTrade({
      direction: alert.direction,
      ticker: alert.ticker,
      amount: Number(process.env.TRADE_AMOUNT) || 1,
      expiry: Number(process.env.TRADE_EXPIRY_SECONDS) || 60,
    });

    await logTrade({ alert, result, timestamp: new Date().toISOString() });

    return NextResponse.json({ success: true, trade: result });
  } catch (err: any) {
    console.error("[WEBHOOK ERROR]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
