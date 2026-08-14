import { assertEquals, assertGreater } from "@std/assert";
import { ECBExchangeRateProvider } from "./ecb-provider.ts";

const shouldRun = Deno.env.get("LIVE_ENDPOINTS") === "true";
const provider = new ECBExchangeRateProvider();

/**
 * End-to-end tests that validate the ECB API is live and returns expected data
 * These tests are skipped by default and only run when LIVE_ENDPOINTS=true
 *
 * Run with: LIVE_ENDPOINTS=true deno test --allow-env --allow-net src/exchange-rates/ecb-provider_e2e_test.ts
 */

Deno.test({
  ignore: !shouldRun,
  name: "getExchangeRates - USD returns valid data",
}, async () => {
  const start = Temporal.PlainDate.from("2024-01-01");
  const end = Temporal.PlainDate.from("2024-01-31");

  const rates = await provider.getExchangeRates("USD", start, end);

  assertGreater(rates.length, 0);
  const hasNonBackfilled = rates.some((r) => !r.backfilled);
  assertEquals(hasNonBackfilled, true);
});

Deno.test({
  ignore: !shouldRun,
  name: "getExchangeRates - GBP returns valid data",
}, async () => {
  const start = Temporal.PlainDate.from("2024-06-01");
  const end = Temporal.PlainDate.from("2024-06-30");

  const rates = await provider.getExchangeRates("GBP", start, end);

  assertGreater(rates.length, 0);
  assertEquals(rates[0].date, start);
  assertEquals(rates[rates.length - 1].date, end);
});

Deno.test({
  ignore: !shouldRun,
  name: "getExchangeRates - invalid currency throws NotFoundError",
}, async () => {
  const start = Temporal.PlainDate.from("2024-01-01");
  const end = Temporal.PlainDate.from("2024-01-31");

  try {
    await provider.getExchangeRates("INVALID", start, end);
    throw new Error("Should have thrown Error");
  } catch (e) {
    console.error(e);
    assertEquals((e as Error).name, "NotFoundError");
  }
});
