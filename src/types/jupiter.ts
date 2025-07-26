import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

/**
 * Jupiter Perps position account structure
 * Based on actual API response analysis from inspect-jupiter-response.ts
 */
export interface JupiterPositionAccount {
  /** Owner's wallet address */
  owner: PublicKey;
  /** Pool public key */
  pool: PublicKey;
  /** Custody public key for the position asset */
  custody: PublicKey;
  /** Collateral custody public key */
  collateralCustody: PublicKey;
  /** Position open timestamp */
  openTime: BN;
  /** Last update timestamp */
  updateTime: BN;
  /** Position side (long/short/none) */
  side: JupiterSide;
  /** Entry price in USD (with 6 decimal precision) */
  price: BN;
  /** Position size in USD (with 6 decimal precision) */
  sizeUsd: BN;
  /** Collateral amount in USD (with 6 decimal precision) */
  collateralUsd: BN;
  /** Realized PnL in USD (with 6 decimal precision) */
  realisedPnlUsd: BN;
  /** Cumulative interest snapshot */
  cumulativeInterestSnapshot: BN;
  /** Locked amount */
  lockedAmount: BN;
  /** Bump seed for PDA */
  bump: number;
}

/**
 * Jupiter Side enum - exactly matches actual API response structure
 */
export type JupiterSide =
  | { none: Record<string, never> }
  | { long: Record<string, never> }
  | { short: Record<string, never> };

/**
 * Helper type guards for Jupiter Side enum
 */
export const JupiterSideHelpers = {
  isLong: (side: JupiterSide): side is { long: Record<string, never> } => "long" in side,

  isShort: (side: JupiterSide): side is { short: Record<string, never> } => "short" in side,

  isNone: (side: JupiterSide): side is { none: Record<string, never> } => "none" in side,

  toString: (side: JupiterSide): "LONG" | "SHORT" | "NONE" => {
    if ("long" in side) return "LONG";
    if ("short" in side) return "SHORT";
    return "NONE";
  },
};
