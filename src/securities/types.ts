export type Security = StockSecurity | FundSecurity | OtherSecurity;

export type StockSecurity = {
  type: "stock";
  name: string;
  isin: string;
  exchanges: string[];
  tickers: string[];
};

export type FundSecurity = {
  type: "fund";
  name: string;
  isin: string;
  distributionType: "accumulating" | "distributing";
  exchanges: string[];
  tickers: string[];
};

export type OtherSecurity = {
  type: "other";
  name: string;
  isin: string;
  exchanges: string[];
  tickers: string[];
};

export type SecuritySearchType = "isin" | "ticker" | "name";

export interface SecurityProvider {
  searchSecurities(
    query: string,
    type?: SecuritySearchType,
  ): Promise<Security[]>;
}
