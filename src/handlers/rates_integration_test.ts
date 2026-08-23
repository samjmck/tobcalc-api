import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { createRatesHandler } from "./rates.ts";
import type { ExchangeRateProvider } from "../exchange-rates/types.ts";
import type { ExchangeRate } from "../exchange-rates/types.ts";

class MockExchangeRateProvider implements ExchangeRateProvider {
  private rates: ExchangeRate[] = [];
  private error: Error | null = null;

  setRates(rates: ExchangeRate[]): void {
    this.rates = rates;
    this.error = null;
  }

  setError(error: Error): void {
    this.error = error;
  }

  async getExchangeRates(
    _from: string,
    _start: Temporal.PlainDate,
    _end: Temporal.PlainDate,
  ): Promise<ExchangeRate[]> {
    if (this.error) {
      throw this.error;
    }
    return this.rates;
  }
}

const mockProvider = new MockExchangeRateProvider();
const app = new Hono();
createRatesHandler(app, mockProvider);

Deno.test("missing query parameters", async () => {
  const response = await app.fetch(
    new Request("http://localhost/v1/rates"),
  );

  assertEquals(response.status, 400);
  const json = await response.json();
  assertEquals(
    json.error,
    "Missing required query parameters: from, start, end (ISO 8601 format)",
  );
});

Deno.test("missing from parameter", async () => {
  const response = await app.fetch(
    new Request("http://localhost/v1/rates?start=2024-01-01&end=2024-12-31"),
  );

  assertEquals(response.status, 400);
  const json = await response.json();
  assertEquals(
    json.error,
    "Missing required query parameters: from, start, end (ISO 8601 format)",
  );
});

Deno.test("missing start parameter", async () => {
  const response = await app.fetch(
    new Request("http://localhost/v1/rates?from=USD&end=2024-12-31"),
  );

  assertEquals(response.status, 400);
  const json = await response.json();
  assertEquals(
    json.error,
    "Missing required query parameters: from, start, end (ISO 8601 format)",
  );
});

Deno.test("missing end parameter", async () => {
  const response = await app.fetch(
    new Request("http://localhost/v1/rates?from=USD&start=2024-01-01"),
  );

  assertEquals(response.status, 400);
  const json = await response.json();
  assertEquals(
    json.error,
    "Missing required query parameters: from, start, end (ISO 8601 format)",
  );
});

Deno.test("invalid date format for start", async () => {
  const response = await app.fetch(
    new Request(
      "http://localhost/v1/rates?from=USD&start=invalid-date&end=2024-12-31",
    ),
  );

  assertEquals(response.status, 500);
  const json = await response.json();
  assertEquals(json.error.includes("Failed to fetch exchange rates"), true);
});

Deno.test("invalid date format for end", async () => {
  const response = await app.fetch(
    new Request(
      "http://localhost/v1/rates?from=USD&start=2024-01-01&end=invalid-date",
    ),
  );

  assertEquals(response.status, 500);
  const json = await response.json();
  assertEquals(json.error.includes("Failed to fetch exchange rates"), true);
});

Deno.test("date range exceeds maximum", async () => {
  mockProvider.setError(
    new Error("Date range exceeds maximum of 1825 days (5 years)"),
  );

  const response = await app.fetch(
    new Request(
      "http://localhost/v1/rates?from=USD&start=2020-01-01&end=2030-12-31",
    ),
  );

  assertEquals(response.status, 400);
  const json = await response.json();
  assertEquals(json.error, "Date range exceeds maximum of 1825 days (5 years)");
});

Deno.test("currency not found", async () => {
  mockProvider.setError(
    new Error("Exchange rate for currency INVALID not found"),
  );

  const response = await app.fetch(
    new Request(
      "http://localhost/v1/rates?from=INVALID&start=2024-01-01&end=2024-12-31",
    ),
  );

  assertEquals(response.status, 404);
  const json = await response.json();
  assertEquals(json.error, "Exchange rate for currency INVALID not found");
});

Deno.test("successful request returns exchange rates", async () => {
  const rates = [
    {
      date: Temporal.PlainDate.from("2024-01-01"),
      rate: 1.1050,
      backfilled: false,
    },
    {
      date: Temporal.PlainDate.from("2024-01-02"),
      rate: 1.1055,
      backfilled: false,
    },
    {
      date: Temporal.PlainDate.from("2024-01-03"),
      rate: 1.1055,
      backfilled: true,
    },
  ];
  mockProvider.setRates(rates);

  const response = await app.fetch(
    new Request(
      "http://localhost/v1/rates?from=USD&start=2024-01-01&end=2024-01-03",
    ),
  );

  assertEquals(response.status, 200);
  const json = await response.json();
  assertEquals(json.length, 3);
  assertEquals(json[0].date, "2024-01-01");
  assertEquals(json[0].rate, 1.1050);
  assertEquals(json[0].backfilled, false);
  assertEquals(json[1].date, "2024-01-02");
  assertEquals(json[1].rate, 1.1055);
  assertEquals(json[1].backfilled, false);
  assertEquals(json[2].date, "2024-01-03");
  assertEquals(json[2].rate, 1.1055);
  assertEquals(json[2].backfilled, true);
});

Deno.test("provider throws generic error", async () => {
  mockProvider.setError(new Error("Network error"));

  const response = await app.fetch(
    new Request(
      "http://localhost/v1/rates?from=USD&start=2024-01-01&end=2024-12-31",
    ),
  );

  assertEquals(response.status, 500);
  const json = await response.json();
  assertEquals(json.error, "Failed to fetch exchange rates: Network error");
});
