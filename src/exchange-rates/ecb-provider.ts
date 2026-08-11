import { ExchangeRate, ExchangeRateProvider } from "./types.ts";
import { fetchWithRetry } from "../utils/fetch-with-retry.ts";

const ECB_API_BASE = "https://data-api.ecb.europa.eu/service/data/EXR";
const MAX_DAYS = 1825; // 5 years

export class ECBExchangeRateProvider implements ExchangeRateProvider {
  async getExchangeRates(
    from: string,
    start: Temporal.PlainDate,
    end: Temporal.PlainDate,
  ): Promise<ExchangeRate[]> {
    // Validate date range
    const daysBetween = end.since(start).total("days");
    if (daysBetween > MAX_DAYS) {
      throw new BadRequestError(
        `Date range exceeds maximum of ${MAX_DAYS} days (5 years)`,
      );
    }

    // Build series key and URL
    const seriesKey = `D.${from}.EUR.SP00.A`;
    const startStr = start.toString();
    const endStr = end.toString();
    const url =
      `${ECB_API_BASE}/${seriesKey}?startPeriod=${startStr}&endPeriod=${endStr}&format=csvdata`;

    // Fetch data from ECB
    let response: Response;
    try {
      response = await fetchWithRetry(url, {
        retryOptions: {
          maxRetries: 2,
          timeoutMs: 5000,
          backoffDelayMs: 1000,
        },
      });
    } catch (error) {
      throw new InternalServerError(
        `Failed to fetch exchange rates from ECB: ${error}`,
      );
    }

    // Check for currency not found
    if (response.status === 404) {
      throw new NotFoundError(`Exchange rate for currency ${from} not found`);
    }

    if (!response.ok) {
      throw new InternalServerError(
        `ECB API returned status ${response.status}`,
      );
    }

    // Parse CSV response
    const csv = await response.text();
    const ratesByDate = parseCSV(csv);

    if (ratesByDate.size === 0) {
      throw new InternalServerError(
        "No exchange rate data returned from ECB",
      );
    }

    // Fill in all calendar days with backfilling
    return fillCalendarDays(start, end, ratesByDate);
  }
}

export function parseCSV(csv: string): Map<string, number> {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    return new Map();
  }

  // Find column indices from header
  const header = lines[0].split(",");
  const timePeriodIndex = header.indexOf("TIME_PERIOD");
  const obsValueIndex = header.indexOf("OBS_VALUE");

  if (timePeriodIndex === -1 || obsValueIndex === -1) {
    throw new InternalServerError("Invalid CSV format from ECB");
  }

  const ratesByDate = new Map<string, number>();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    if (row.length <= Math.max(timePeriodIndex, obsValueIndex)) {
      continue;
    }

    const date = row[timePeriodIndex].trim();
    const rateStr = row[obsValueIndex].trim();

    if (date && rateStr) {
      const rate = parseFloat(rateStr);
      if (!isNaN(rate)) {
        ratesByDate.set(date, rate);
      }
    }
  }

  return ratesByDate;
}

export function fillCalendarDays(
  start: Temporal.PlainDate,
  end: Temporal.PlainDate,
  ratesByDate: Map<string, number>,
): ExchangeRate[] {
  const result: ExchangeRate[] = [];
  let currentDate = start;
  let lastRate: number | null = null;

  while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
    const dateStr = currentDate.toString();
    const rate = ratesByDate.get(dateStr);

    if (rate !== undefined) {
      result.push({
        date: currentDate,
        rate,
        backfilled: false,
      });
      lastRate = rate;
    } else if (lastRate !== null) {
      result.push({
        date: currentDate,
        rate: lastRate,
        backfilled: true,
      });
    }

    currentDate = currentDate.add({ days: 1 });
  }

  return result;
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalServerError";
  }
}
