/** Inject-only contracts for a future read-only source. This module creates no RPC client. */
export type MarketSnapshot = {
  observedSlot: number;
  mint: string;
  decimals: number;
  price?: string;
  liquidity?: string;
  volume?: string;
};

export type AccountSnapshot = {
  observedSlot: number;
  address: string;
  owner: string;
  dataBase64: string;
};

export interface PublicDataSource {
  readMarket(): Promise<MarketSnapshot | null>;
  readAccount(address: string): Promise<AccountSnapshot | null>;
}

/** No live source is configured. A future adapter must be explicitly injected and verified. */
export const publicDataSource: PublicDataSource | null = null;

