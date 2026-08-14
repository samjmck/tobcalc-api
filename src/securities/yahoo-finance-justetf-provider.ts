import { Security, SecurityProvider } from "./types.ts";
import { fetchWithRetry } from "../utils/fetch-with-retry.ts";

export const httpClient = {
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetchWithRetry(url, init);
  },
};

export interface YahooFinanceQuote {
  exchange: string;
  shortname?: string;
  quoteType: string;
  symbol: string;
  typeDisp: string;
  longname?: string;
  exchDisp: string;
  isYahooFinance: boolean;
}

export interface YahooFinanceResponse {
  quotes: YahooFinanceQuote[];
  count: number;
}

/**
 * Parse Yahoo Finance response and extract the first quote if available
 */
export function parseYahooFinanceResponse(
  response: YahooFinanceResponse,
): YahooFinanceQuote | null {
  if (!response.quotes || response.quotes.length === 0) {
    return null;
  }
  return response.quotes[0];
}

/**
 * Parse justETF HTML response and determine distribution type
 */
export function parseJustETFDistributionType(html: string): "accumulating" | "distributing" {
  const accumulatingPattern =
    /<td class="val" data-testid="tl_etf-basics_value_distribution-policy">Accumulating<\/td>/g;
  const isAccumulating = accumulatingPattern.test(html);
  return isAccumulating ? "accumulating" : "distributing";
}

export class YahooFinanceJustETFSecurityProvider implements SecurityProvider {
  /**
   * How it works:
   * 1. Query Yahoo Finance API with ISIN to determine the security type (stock, ETF, etc.)
   * 2. If security is not found on Yahoo Finance, return null
   * 3. If security is an ETF, make a request to justETF to determine the distribution type (accumulating or distributing)
   *
   * Error handling:
   * - Network failures or HTTP errors are thrown as exceptions
   * - If ISIN is not found on Yahoo Finance, return null
   * - If ISIN is identified as ETF on Yahoo Finance but not found on justETF, throw error (unexpected)
   */
  async searchSecurity(isin: string): Promise<Security | null> {
    const yahooQuotes = await this.queryYahooFinance(isin);

    if (yahooQuotes.length === 0) {
      // ISIN not found on Yahoo Finance
      return null;
    }

    const yahooQuote = yahooQuotes[0];

    const securityType = yahooQuote.quoteType.toLowerCase();
    const name = yahooQuote.longname || yahooQuote.shortname || "Unknown";
    const exchanges = [yahooQuote.exchange];
    const tickers = [yahooQuote.symbol];

    // For ETFs, fetch additional details from justETF to determine distribution type
    if (securityType === "etf") {
      const distributionType = await this.queryJustETFForDistributionType(isin);

      return {
        type: "fund",
        name,
        distributionType,
        exchanges,
        tickers,
      };
    }

    if (securityType === "equity") {
      return {
        type: "stock",
        name,
        exchanges,
        tickers,
      };
    }

    return {
      type: "other",
      name,
      exchanges,
      tickers,
    };
  }

  private async queryYahooFinance(
    isin: string,
  ): Promise<YahooFinanceQuote[]> {
    const url = new URL("https://query2.finance.yahoo.com/v1/finance/search");
    url.searchParams.append("q", isin);
    url.searchParams.append("lang", "en-US");
    url.searchParams.append("region", "US");
    url.searchParams.append("quotesCount", "6");
    url.searchParams.append("newsCount", "3");
    url.searchParams.append("listsCount", "2");
    url.searchParams.append("enableFuzzyQuery", "false");
    url.searchParams.append("quotesQueryId", "tss_match_phrase_query");
    url.searchParams.append(
      "multiQuoteQueryId",
      "multi_quote_single_token_query",
    );
    url.searchParams.append("newsQueryId", "news_cie_vespa");
    url.searchParams.append("enableCb", "false");
    url.searchParams.append("enableNavLinks", "true");
    url.searchParams.append("enableEnhancedTrivialQuery", "true");
    url.searchParams.append("enableResearchReports", "true");
    url.searchParams.append("enableCulturalAssets", "true");
    url.searchParams.append("enableLogoUrl", "true");
    url.searchParams.append("enableLists", "false");
    url.searchParams.append("enableNcgNews", "true");
    url.searchParams.append("recommendCount", "5");
    url.searchParams.append("enableCccBoost", "true");
    url.searchParams.append("enablePrivateCompany", "true");

    const response = await httpClient.fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
      },
    });

    const data = await response.json() as YahooFinanceResponse;

    if (!data.quotes) {
      throw new Error("Yahoo Finance response did not contain quotes field");
    }

    return data.quotes;
  }

  /**
   * Query justETF to determine if an ETF is accumulating or distributing
   *
   * Uses a simple regex to find an expected value in the HTML that indicates the security is accumulating or distributing
   * Throws if the ETF is not found (expected to exist if Yahoo Finance identified it as ETF)
   */
  private async queryJustETFForDistributionType(
    isin: string,
  ): Promise<"accumulating" | "distributing"> {
    const url = `https://www.justetf.com/uk/etf-profile.html?isin=${
      encodeURIComponent(isin)
    }`;

    const response = await httpClient.fetch(url, {
      method: "GET",
    });

    const html = await response.text();
    return parseJustETFDistributionType(html);
  }
}
