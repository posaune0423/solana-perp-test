export interface Position {
  /** Market symbol (e.g., "SOL", "BTC", "ETH") */
  symbol: string;
  /** Position size in USD value */
  sizeUsd: number;
  /** Position size in base asset amount (e.g., SOL amount for SOL-PERP) */
  baseAmount: number;
  direction: "LONG" | "SHORT";
  /** Unrealized PnL in USD */
  pnl: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  /** Protocol-specific market identifier (optional for internal use) */
  protocolMarketId?: string | number;
}

// Export Jupiter-specific types
export * from "./jupiter";
