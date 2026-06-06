import fs from "fs/promises";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "trade_log.json");

export interface TradeLog {
 alert: object;
 result: object;
 timestamp: string;
}

export async function logTrade(entry: TradeLog) {
 try {
   let logs: TradeLog[] = [];
   try {
     const data = await fs.readFile(LOG_FILE, "utf-8");
     logs = JSON.parse(data);
   } catch {}
   logs.push(entry);
   if (logs.length > 1000) logs = logs.slice(-1000);
   await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
   console.log(`[LOGGER] Trade logged. Total: ${logs.length}`);
   if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
     await pushToSupabase(entry);
   }
 } catch (err: any) {
   console.error("[LOGGER ERROR]", err.message);
 }
}

async function pushToSupabase(entry: TradeLog) {
 try {
   const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/trades`, {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       apikey: process.env.SUPABASE_ANON_KEY!,
       Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
     },
     body: JSON.stringify(entry),
   });
   if (!res.ok) throw new Error(await res.text());
   console.log("[LOGGER] Trade pushed to Supabase");
 } catch (err: any) {
   console.error("[LOGGER SUPABASE ERROR]", err.message);
 }
}
