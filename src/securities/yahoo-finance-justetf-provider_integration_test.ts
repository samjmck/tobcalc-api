import { assertEquals } from "@std/assert";
import {
  httpClient,
  YahooFinanceJustETFSecurityProvider,
  YahooFinanceResponse,
} from "./yahoo-finance-justetf-provider.ts";

const provider = new YahooFinanceJustETFSecurityProvider();

/**
 * Helper to mock httpClient.fetch for the duration of a test
 * Automatically restores the original implementation after the test
 */
async function withMockedHttpClient(
  mockFetch: (url: string, init?: RequestInit) => Promise<Response>,
  testFn: () => Promise<void>,
): Promise<void> {
  const originalFetch = httpClient.fetch;
  httpClient.fetch = mockFetch;
  try {
    await testFn();
  } finally {
    httpClient.fetch = originalFetch;
  }
}

function mockResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

function yahooFinanceStockResponse(): YahooFinanceResponse {
  return {
    quotes: [
      {
        exchange: "XETR",
        shortname: "Apple Inc.",
        quoteType: "EQUITY",
        symbol: "APC.DE",
        typeDisp: "Equity",
        longname: "Apple Inc.",
        exchDisp: "XETRA",
        isYahooFinance: true,
      },
    ],
    count: 1,
  };
}

function yahooFinanceETFResponse(): YahooFinanceResponse {
  return {
    quotes: [
      {
        exchange: "AMS",
        shortname: "iShares Core MSCI World UCITS ETF",
        quoteType: "ETF",
        symbol: "IWDA.AS",
        typeDisp: "ETF",
        longname: "iShares Core MSCI World UCITS ETF USD (Acc)",
        exchDisp: "Amsterdam",
        isYahooFinance: true,
      },
    ],
    count: 1,
  };
}

function justETFAccumulatingHTML(): string {
  return `
    <tr data-testid="etf-basics_row_distribution-policy">
      <td class="vallabel" data-testid="etf-basics_label_distribution-policy">Distribution policy</td>
      <td class="val" data-testid="tl_etf-basics_value_distribution-policy">Accumulating</td>
    </tr>
  `;
}

function justETFDistributingHTML(): string {
  return `
    <tr data-testid="etf-basics_row_distribution-policy">
      <td class="vallabel" data-testid="etf-basics_label_distribution-policy">Distribution policy</td>
      <td class="val" data-testid="tl_etf-basics_value_distribution-policy">Distributing</td>
    </tr>
  `;
}

Deno.test("searchSecurity - stock found", async () => {
  await withMockedHttpClient(
    async () => mockResponse(JSON.stringify(yahooFinanceStockResponse())),
    async () => {
      const result = await provider.searchSecurity("US0378331005");

      assertEquals(result?.type, "stock");
      assertEquals(result?.name, "Apple Inc.");
      assertEquals(result?.exchanges, ["XETR"]);
      assertEquals(result?.tickers, ["APC.DE"]);
    },
  );
});

Deno.test("searchSecurity - ETF accumulating found", async () => {
  let callCount = 0;

  await withMockedHttpClient(
    async (url: string) => {
      callCount++;
      // First call is Yahoo Finance, second call is justETF
      if (callCount === 1) {
        return mockResponse(JSON.stringify(yahooFinanceETFResponse()));
      } else {
        return mockResponse(justETFAccumulatingHTML());
      }
    },
    async () => {
      const result = await provider.searchSecurity("IE00B4L5Y983");

      assertEquals(result?.type, "fund");
      assertEquals(result?.name, "iShares Core MSCI World UCITS ETF USD (Acc)");
      assertEquals((result as any).distributionType, "accumulating");
      assertEquals(result?.exchanges, ["AMS"]);
      assertEquals(result?.tickers, ["IWDA.AS"]);
    },
  );
});

Deno.test("searchSecurity - ETF distributing found", async () => {
  let callCount = 0;

  await withMockedHttpClient(
    async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return mockResponse(JSON.stringify(yahooFinanceETFResponse()));
      } else {
        return mockResponse(justETFDistributingHTML());
      }
    },
    async () => {
      const result = await provider.searchSecurity("IE00B4L5Y983");

      assertEquals(result?.type, "fund");
      assertEquals((result as any).distributionType, "distributing");
    },
  );
});

Deno.test("searchSecurity - security not found returns null", async () => {
  await withMockedHttpClient(
    async () => mockResponse(JSON.stringify({ quotes: [], count: 0 })),
    async () => {
      const result = await provider.searchSecurity("INVALID000000");

      assertEquals(result, null);
    },
  );
});

Deno.test("searchSecurity - network error throws", async () => {
  await withMockedHttpClient(
    async () => {
      throw new Error("Network error");
    },
    async () => {
      try {
        await provider.searchSecurity("IE00B4L5Y983");
        throw new Error("Should have thrown");
      } catch (e) {
        assertEquals((e as Error).message, "Network error");
      }
    },
  );
});

Deno.test("searchSecurity - justETF error throws", async () => {
  let callCount = 0;

  await withMockedHttpClient(
    async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return mockResponse(JSON.stringify(yahooFinanceETFResponse()));
      } else {
        throw new Error("justETF API error");
      }
    },
    async () => {
      try {
        await provider.searchSecurity("IE00B4L5Y983");
        throw new Error("Should have thrown");
      } catch (e) {
        assertEquals((e as Error).message, "justETF API error");
      }
    },
  );
});

Deno.test("searchSecurity - other security type", async () => {
  const otherResponse: YahooFinanceResponse = {
    quotes: [
      {
        exchange: "XETR",
        shortname: "Some Fund",
        quoteType: "MUTUALFUND",
        symbol: "FUND.DE",
        typeDisp: "Mutual Fund",
        longname: "Some Mutual Fund",
        exchDisp: "XETRA",
        isYahooFinance: true,
      },
    ],
    count: 1,
  };

  await withMockedHttpClient(
    async () => mockResponse(JSON.stringify(otherResponse)),
    async () => {
      const result = await provider.searchSecurity("SOMEISIN123456");

      assertEquals(result?.type, "other");
      assertEquals(result?.name, "Some Mutual Fund");
    },
  );
});
