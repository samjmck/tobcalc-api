# tobcalc-api

The goal of this API is to provide endpoints to fetch whatever information is necessary for [tobcalc-lib](https://github.com/samjmck/tobcalc-lib) to be able to accurately calculate the TOB (Belgian stock-exchange transaction tax) given a list of transactions from a broker. 

Currently, the required information to be able to determine the TOB is:

1. Exchange rates for a given currency and rate range from the ECB
2. Security information (name, ISIN, accumulating/distributing...) 

## API design

### Security endpoint

**`GET /v1/security?query=<value>&type=<type>`**

Fetch security metadata by value such as ISIN or security name.

**Query parameters:**
- `query` (required): The identifier to search for (ISIN, ticker symbol, or security name)
- `type` (optional): Hint for the query type. One of: `isin`, `ticker`, `name`.

**Response:** Array of matching securities. Each security is a discriminated union with a `type` field:

```typescript
type Security = StockSecurity | FundSecurity | OtherSecurity

type StockSecurity = {
  type: "stock"
  name: string
  isin: string
  exchanges: string[]
  tickers: string[]
}

type FundSecurity = {
  type: "fund"
  name: string
  isin: string
  distribution_type: "accumulating" | "distributing"
  exchanges: string[]
  tickers: string[]
}

type OtherSecurity = {
  type: "other"
  name: string
  isin: string
  exchanges: string[]
  tickers: string[]
}
```

**Error handling:**
- No matches found: `200 OK` with empty array `[]`

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