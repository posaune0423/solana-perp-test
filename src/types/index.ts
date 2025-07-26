export interface Position {
  marketIndex: number;
  symbol: string;
  size: number;
  direction: "LONG" | "SHORT";
  pnl: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
}

// Export Jupiter-specific types
export * from "./jupiter";
