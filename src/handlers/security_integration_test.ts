import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { createSecurityHandler } from "./security.ts";
import type { SecurityProvider } from "../securities/types.ts";
import type { Security } from "../securities/types.ts";

class MockSecurityProvider implements SecurityProvider {
  private security: Security | null = null;
  private error: Error | null = null;

  setSecurity(security: Security | null): void {
    this.security = security;
    this.error = null;
  }

  setError(error: Error): void {
    this.error = error;
  }

  async searchSecurity(_isin: string): Promise<Security | null> {
    if (this.error) {
      throw this.error;
    }
    return this.security;
  }
}

const mockProvider = new MockSecurityProvider();
const app = new Hono();
createSecurityHandler(app, mockProvider);

Deno.test("security found", async () => {
  mockProvider.setSecurity({
    type: "stock",
    name: "Apple Inc.",
    exchanges: ["XETR"],
    tickers: ["APC.DE"],
  });

  const response = await app.fetch(
    new Request("http://localhost/security/US0378331005"),
  );

  assertEquals(response.status, 200);
  const json = await response.json();
  assertEquals(json.type, "stock");
  assertEquals(json.name, "Apple Inc.");
  assertEquals(json.exchanges, ["XETR"]);
  assertEquals(json.tickers, ["APC.DE"]);
});

Deno.test("fund found", async () => {
  mockProvider.setSecurity({
    type: "fund",
    name: "iShares Core MSCI World UCITS ETF",
    distributionType: "accumulating",
    exchanges: ["AMS"],
    tickers: ["IWDA.AS"],
  });

  const response = await app.fetch(
    new Request("http://localhost/security/IE00B4L5Y983"),
  );

  assertEquals(response.status, 200);
  const json = await response.json();
  assertEquals(json.type, "fund");
  assertEquals(json.name, "iShares Core MSCI World UCITS ETF");
  assertEquals(json.distributionType, "accumulating");
});

Deno.test("security not found", async () => {
  mockProvider.setSecurity(null);

  const response = await app.fetch(
    new Request("http://localhost/security/INVALID000000"),
  );

  assertEquals(response.status, 404);
  const json = await response.json();
  assertEquals(json.error, "Security with ISIN INVALID000000 not found");
});

Deno.test("provider throws error", async () => {
  mockProvider.setError(new Error("External API error"));

  const response = await app.fetch(
    new Request("http://localhost/security/IE00B4L5Y983"),
  );

  assertEquals(response.status, 500);
  const json = await response.json();
  assertEquals(
    json.error,
    "Failed to fetch security details: External API error",
  );
});

Deno.test("other security type", async () => {
  mockProvider.setSecurity({
    type: "other",
    name: "Some Fund",
    exchanges: ["XETR"],
    tickers: ["FUND.DE"],
  });

  const response = await app.fetch(
    new Request("http://localhost/security/SOMEISIN123456"),
  );

  assertEquals(response.status, 200);
  const json = await response.json();
  assertEquals(json.type, "other");
  assertEquals(json.name, "Some Fund");
});
