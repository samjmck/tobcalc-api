import { Hono } from "hono";
import { ECBExchangeRateProvider } from "../exchange-rates/ecb-provider.ts";
import { YahooFinanceJustETFSecurityProvider } from "../securities/yahoo-finance-justetf-provider.ts";
import type { ExchangeRateProvider } from "../exchange-rates/types.ts";
import type { SecurityProvider } from "../securities/types.ts";
import { createRatesHandler } from "./rates.ts";
import { createSecurityHandler } from "./security.ts";

export function createApp(
  exchangeRateProvider: ExchangeRateProvider,
  securityProvider: SecurityProvider,
) {
  const app = new Hono();
  createRatesHandler(app, exchangeRateProvider);
  createSecurityHandler(app, securityProvider);
  return app;
}

const app = createApp(
  new ECBExchangeRateProvider(),
  new YahooFinanceJustETFSecurityProvider(),
);

export default app;
