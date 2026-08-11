import { assertEquals } from "@std/assert";
import {
  parseJustETFDistributionType,
  parseYahooFinanceResponse,
  YahooFinanceResponse,
} from "./yahoo-finance-justetf-provider.ts";

Deno.test("parseYahooFinanceResponse - returns first quote when found", () => {
  const response: YahooFinanceResponse = {
    quotes: [
      {
        exchange: "AMS",
        shortname: "iShares Core MSCI World UCITS E",
        quoteType: "ETF",
        symbol: "IWDA.AS",
        typeDisp: "ETF",
        longname: "iShares Core MSCI World UCITS ETF USD (Acc)",
        exchDisp: "Amsterdam",
        isYahooFinance: true,
      },
      {
        exchange: "MEX",
        shortname: "ISHARES III PLC CORE MSCI WORLD",
        quoteType: "ETF",
        symbol: "IWDAN.MX",
        typeDisp: "ETF",
        longname:
          "iShares III Public Limited Company - iShares Core MSCI World UCITS ETF",
        exchDisp: "Mexico",
        isYahooFinance: true,
      },
    ],
    count: 2,
  };

  const result = parseYahooFinanceResponse(response);

  assertEquals(result?.symbol, "IWDA.AS");
  assertEquals(result?.quoteType, "ETF");
});

Deno.test("parseYahooFinanceResponse - returns null when no quotes", () => {
  const response: YahooFinanceResponse = {
    quotes: [],
    count: 0,
  };

  const result = parseYahooFinanceResponse(response);

  assertEquals(result, null);
});

Deno.test("parseYahooFinanceResponse - handles missing quotes field", () => {
  const response = {
    count: 0,
  } as unknown as YahooFinanceResponse;

  const result = parseYahooFinanceResponse(response);

  assertEquals(result, null);
});

Deno.test("parseJustETFDistributionType - detects accumulating ETF", () => {
  const html = `
    <tr data-testid="etf-basics_row_distribution-policy">
      <td class="vallabel" data-testid="etf-basics_label_distribution-policy">Distribution policy</td>
      <td class="val" data-testid="tl_etf-basics_value_distribution-policy">Accumulating</td>
    </tr>
  `;

  const result = parseJustETFDistributionType(html);

  assertEquals(result, "accumulating");
});

Deno.test("parseJustETFDistributionType - defaults to distributing when accumulating not found", () => {
  const html = `
    <tr data-testid="etf-basics_row_distribution-policy">
      <td class="vallabel" data-testid="etf-basics_label_distribution-policy">Distribution policy</td>
      <td class="val" data-testid="tl_etf-basics_value_distribution-policy">Distributing</td>
    </tr>
  `;

  const result = parseJustETFDistributionType(html);

  assertEquals(result, "distributing");
});
