export interface TradeAlert {
 direction: "CALL" | "PUT";
 ticker: string;
 price?: number;
 interval?: string;
 raw: string;
}

export function parseAlert(body: string): Partial<TradeAlert> {
 const raw = body.trim();

 try {
   const json = JSON.parse(raw);
   return {
     direction: json.direction?.toUpperCase() as "CALL" | "PUT",
     ticker: normalizeTicker(json.ticker || ""),
     price: json.price ? Number(json.price) : undefined,
     interval: json.interval,
     raw,
   };
 } catch {}

 const dirMatch = raw.match(/\b(CALL|PUT)\b/i);
 const tickerMatch = raw.match(/on\s+([A-Z]{6,8})/i);
 const priceMatch = raw.match(/Price:\s*([\d.]+)/i);
 const tfMatch = raw.match(/TF:\s*(\S+)/i);

 return {
   direction: dirMatch ? (dirMatch[1].toUpperCase() as "CALL" | "PUT") : undefined,
   ticker: tickerMatch ? normalizeTicker(tickerMatch[1]) : "",
   price: priceMatch ? Number(priceMatch[1]) : undefined,
   interval: tfMatch ? tfMatch[1] : undefined,
   raw,
 };
}

export function validateAlert(alert: Partial<TradeAlert>): alert is TradeAlert {
 if (!alert.direction || !["CALL", "PUT"].includes(alert.direction)) return false;
 if (!alert.ticker || alert.ticker.length < 6) return false;
 return true;
}

function normalizeTicker(raw: string): string {
 return raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}
