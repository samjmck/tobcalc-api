# tobcalc-api

The goal of this API is to provide endpoints to fetch whatever information is necessary for [tobcalc-lib](https://github.com/samjmck/tobcalc-lib) to be able to accurately calculate the TOB (Belgian stock-exchange transaction tax) given a list of transactions from a broker. 

Currently, the required information to be able to determine the TOB is:

1. Exchange rates for a given currency and date range from the ECB
2. Security information (name, ISIN, accumulating/distributing...) given an ISIN

## API design

### Security endpoint

**`GET /v1/security/:isin`**

Fetch security metadata by ISIN. The response includes the security type (stock, fund/ETF, or other) and additional details such as listing exchanges, tickers, and for ETFs, the distribution type (accumulating or distributing).

**Path parameters:**
- `isin` (required): The ISIN of the security (e.g., `IE00B4L5Y983`)

**Response:** A single security object. Each security is a discriminated union with a `type` field:

```typescript
type Security = StockSecurity | FundSecurity | OtherSecurity

type StockSecurity = {
  type: "stock"
  name: string
  exchanges: string[]
  tickers: string[]
}

type FundSecurity = {
  type: "fund"
  name: string
  distributionType: "accumulating" | "distributing"
  exchanges: string[]
  tickers: string[]
}

type OtherSecurity = {
  type: "other"
  name: string
  exchanges: string[]
  tickers: string[]
}
```

**Error handling:**
- ISIN not found: `404 Not Found`
- Unable to fetch security details (network error, external API failure): `500 Internal Server Error`

### Exchange rates endpoint

**`GET /v1/rates?from=<currency>&start=<date>&end=<date>`**

Fetch daily exchange rates from a currency to EUR over a date range from the ECB.

**Query parameters:**
- `from` (required): From currency code (e.g. `USD`)
- `start` (required): Start date in ISO 8601 format (e.g. `2024-01-01`)
- `end` (required): End date in ISO 8601 format (e.g. `2024-12-31`)

**Response:** Array of daily rates, one entry per day in the requested range. Rates for non-trading days are backfilled with the previous close, identified through `backfilled: true`.

```typescript
type ExchangeRate = {
  date: string  // ISO 8601 format
  rate: number
  backfilled: boolean  // true if this is a backfilled rate from the previous trading day
}
```

**Constraints:**
- Maximum date range: 5 years (1825 days)

**Error handling:**
- Currency pair not available: `404 Not Found`
- Date range exceeds 5 years: `400 Bad Request`
- Data unavailable or stale: `500 Internal Server Error`

## Testing strategy

We have 3 layers of tests, with each layer achieving a different goal:

1. **Unit tests ending in `_test.ts`.** Ensures the parsing logic for the different responses are correct.
2. **Integration tests ending in `_integration_test.ts`.** These test the full flow of the service functions, including error handling and different response states. `fetch` calls are mocked in these tests. 
3. **End-to-end tests ending in `_e2e_test.ts`.** Test the services against live endpoints to check that the endpoints are still live and that the responses are in the expected format. _These tests should only be run in a local developer environment, since in a CI pipeline the requests are likely to be blocked anyway._

If you're running the tests locally, use:

```bash
LIVE_ENDPOINTS=true deno test --allow-env --allow-net src/**/*_test.ts
```

The `LIVE_ENDPOINTS=true` environment variable ensures the end-to-end tests also get run.

If you're configuring a CI environment to run the tests, you can try the above command first. If you experience network issues due to e.g. Yahoo Finance blocking your requests, run it without the environment variable:

```bash
deno test --allow-env --allow-net src/**/*_test.ts
```