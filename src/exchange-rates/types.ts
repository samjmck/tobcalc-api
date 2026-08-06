export type ExchangeRate = {
  date: Temporal.PlainDate;
  rate: number;
  backfilled: boolean;
};

export interface ExchangeRateProvider {
  getExchangeRates(
    from: string,
    start: Temporal.PlainDate,
    end: Temporal.PlainDate
  ): Promise<ExchangeRate[]>;
}
