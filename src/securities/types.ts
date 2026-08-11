export type Security = StockSecurity | FundSecurity | OtherSecurity;

export type StockSecurity = {
  type: "stock";
  name: string;
  exchanges: string[];
  tickers: string[];
};

export type FundSecurity = {
  type: "fund";
  name: string;
  distributionType: "accumulating" | "distributing";
  exchanges: string[];
  tickers: string[];
};

export type OtherSecurity = {
  type: "other";
  name: string;
  exchanges: string[];
  tickers: string[];
};

export interface SecurityProvider {
  searchSecurities(isin: string): Promise<Security | null>;
}
