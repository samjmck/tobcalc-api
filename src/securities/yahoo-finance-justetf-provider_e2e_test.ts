import { assertEquals, assertNotEquals } from "@std/assert";
import { YahooFinanceJustETFSecurityProvider } from "./yahoo-finance-justetf-provider.ts";
import { FundSecurity, StockSecurity } from "./types.ts";

const shouldRun = Deno.env.get("LIVE_ENDPOINTS") === "true";
const provider = new YahooFinanceJustETFSecurityProvider();

/**
 * End-to-end tests that validate real endpoints are live and return expected data
 * These tests are skipped by default and only run when LIVE_ENDPOINTS=true
 *
 * Run with: LIVE_ENDPOINTS=true deno test src/securities/yahoo-finance-justetf-provider_e2e_test.ts
 */

Deno.test({
  ignore: !shouldRun,
  name: "searchSecurity - stock (Apple) returns correct data",
}, async () => {
  const result = <StockSecurity> await provider.searchSecurity("US0378331005");

  assertNotEquals(result, null);
  assertEquals(result.type, "stock");
  assertEquals(result.name.toLowerCase().includes("apple"), true);
  assertNotEquals(result.exchanges.length, 0);
  assertNotEquals(result.tickers.length, 0);
});

Deno.test({
  ignore: !shouldRun,
  name: "searchSecurity - ETF accumulating returns correct data",
}, async () => {
  // IE00B4L5Y983 is iShares Core MSCI World UCITS ETF (Acc)
  const result = <FundSecurity> await provider.searchSecurity("IE00B4L5Y983");

  assertNotEquals(result, null);
  assertEquals(result.type, "fund");
  assertEquals(result.distributionType, "accumulating");
  assertNotEquals(result.exchanges.length, 0);
  assertNotEquals(result.tickers.length, 0);
});

Deno.test({
  ignore: !shouldRun,
  name: "searchSecurity - ETF distributing returns correct data",
}, async () => {
  // IE00B0M62Q58 is iShares MSCI World UCITS ETF (Dist)
  const result = <FundSecurity> await provider.searchSecurity("IE00B0M62Q58");

  assertNotEquals(result, null);
  assertEquals(result.type, "fund");
  assertEquals(result.distributionType, "distributing");
  assertNotEquals(result.exchanges.length, 0);
  assertNotEquals(result.tickers.length, 0);
});

Deno.test({
  ignore: !shouldRun,
  name: "searchSecurity - invalid ISIN returns null",
}, async () => {
  const result = await provider.searchSecurity("INVALID0000000000");

  assertEquals(result, null);
});
