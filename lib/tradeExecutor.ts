import puppeteer, { Browser, Page } from "puppeteer";

export interface TradeParams {
 direction: "CALL" | "PUT";
 ticker: string;
 amount: number;
 expiry: number;
}

export interface TradeResult {
 success: boolean;
 direction: string;
 amount: number;
 ticker: string;
 timestamp: string;
 error?: string;
}

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
 if (!browser || !browser.connected) {
   browser = await puppeteer.launch({
     headless: true,
     executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
     args: [
       "--no-sandbox",
       "--disable-setuid-sandbox",
       "--disable-dev-shm-usage",
       "--disable-gpu",
     ],
   });
 }
 return browser;
}

export async function executeTrade(params: TradeParams): Promise<TradeResult> {
 const timestamp = new Date().toISOString();

 if (!process.env.POCKET_EMAIL || !process.env.POCKET_PASSWORD) {
   throw new Error("POCKET_EMAIL and POCKET_PASSWORD must be set in .env");
 }

 const b = await getBrowser();
 const page = await b.newPage();

 try {
   await page.setViewport({ width: 1280, height: 800 });
   await page.setUserAgent(
     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
   );

   await ensureLoggedIn(page);
   await selectAsset(page, params.ticker);
   await setAmount(page, params.amount);
   await setExpiry(page, params.expiry);
   await clickDirection(page, params.direction);

   console.log(`[EXECUTOR] Trade placed: ${params.direction} ${params.ticker} $${params.amount}`);
   return { success: true, direction: params.direction, amount: params.amount, ticker: params.ticker, timestamp };
 } catch (err: any) {
   console.error("[EXECUTOR ERROR]", err.message);
   return { success: false, direction: params.direction, amount: params.amount, ticker: params.ticker, timestamp, error: err.message };
 } finally {
   await page.close();
 }
}

async function ensureLoggedIn(page: Page) {
 await page.goto("https://pocketoption.com/en/cabinet/quick-high-low/", { waitUntil: "networkidle2", timeout: 30000 });
 const onTradingPage = await page.$(".trading-chart").catch(() => null);
 if (onTradingPage) return;

 await page.goto("https://pocketoption.com/en/login/", { waitUntil: "networkidle2" });
 await page.waitForSelector('input[name="email"]', { timeout: 10000 });
 await page.type('input[name="email"]', process.env.POCKET_EMAIL!, { delay: 50 });
 await page.type('input[name="password"]', process.env.POCKET_PASSWORD!, { delay: 50 });
 await page.click('button[type="submit"]');
 await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 });
 console.log("[EXECUTOR] Logged in to Pocket Option");
}

async function selectAsset(page: Page, ticker: string) {
 const assetSelector = '.assets-select, .selected-instrument, [data-id="asset"]';
 await page.waitForSelector(assetSelector, { timeout: 10000 });
 await page.click(assetSelector);
 const searchBox = 'input[placeholder*="search"], .assets-search input';
 await page.waitForSelector(searchBox, { timeout: 5000 });
 await page.type(searchBox, ticker, { delay: 50 });
 await page.waitForTimeout(500);
 const assetItem = await page.$(`[data-id="${ticker}"], .asset-item`);
 if (assetItem) await assetItem.click();
 else throw new Error(`Asset not found: ${ticker}`);
}

async function setAmount(page: Page, amount: number) {
 const amountInput = '.input-amount, input[name="amount"], .trade-amount input';
 await page.waitForSelector(amountInput, { timeout: 5000 });
 await page.click(amountInput);
 await page.evaluate((sel) => {
   const el = document.querySelector(sel) as HTMLInputElement;
   if (el) { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); }
 }, amountInput);
 await page.type(amountInput, String(amount), { delay: 50 });
}

async function setExpiry(page: Page, seconds: number) {
 const expirySelector = '.timer-selector, .expiry-time, [data-type="expiry"]';
 const el = await page.$(expirySelector).catch(() => null);
 if (!el) return;
 await el.click();
 const minutes = Math.floor(seconds / 60);
 const option = await page.$(`[data-value="${seconds}"], [title="${minutes}:00"]`).catch(() => null);
 if (option) await option.click();
}

async function clickDirection(page: Page, direction: "CALL" | "PUT") {
 const selector = direction === "CALL"
   ? '.btn-call, .button-call, [data-direction="call"], .invest-button.call'
   : '.btn-put, .button-put, [data-direction="put"], .invest-button.put';
 await page.waitForSelector(selector, { timeout: 5000 });
 await page.click(selector);
}
