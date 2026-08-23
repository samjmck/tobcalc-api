import { Hono } from "hono";
import { Temporal } from "npm:temporal-polyfill";
import type { ExchangeRateProvider } from "../exchange-rates/types.ts";

export function createRatesHandler(
  app: Hono,
  exchangeRateProvider: ExchangeRateProvider,
): void {
  app.get("/v1/rates", async (c) => {
    const { from, start, end } = c.req.query();

    if (!from || !start || !end) {
      return c.json(
        {
          error:
            "Missing required query parameters: from, start, end (ISO 8601 format)",
        },
        400,
      );
    }

    try {
      const startDate = Temporal.PlainDate.from(start);
      const endDate = Temporal.PlainDate.from(end);

      const rates = await exchangeRateProvider.getExchangeRates(
        from,
        startDate,
        endDate,
      );

      // Serialize Temporal.PlainDate to ISO strings
      const serializedRates = rates.map((rate) => ({
        date: rate.date.toString(),
        rate: rate.rate,
        backfilled: rate.backfilled,
      }));

      return c.json(serializedRates);
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Handle specific error types
        if (message.includes("not found")) {
          return c.json({ error: error.message }, 404);
        }

        if (
          message.includes("exceeds maximum") ||
          message.includes("invalid syntax")
        ) {
          return c.json({ error: error.message }, 400);
        }
      }

      const message = error instanceof Error
        ? error.message
        : "Unknown error occurred";
      return c.json({ error: `Failed to fetch exchange rates: ${message}` }, 500);
    }
  });
}
