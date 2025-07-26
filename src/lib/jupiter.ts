import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  JUPITER_MARKETS,
  JUPITER_PERPETUALS_PROGRAM,
  RPC_CONNECTION,
  USD_PRECISION,
  USDC_DECIMALS,
} from "../constants";
import type { Position } from "../types";
import type { JupiterPositionAccount } from "../types/jupiter";
import { JupiterSideHelpers } from "../types/jupiter";
import { getErrorDetails, logger } from "../utils";

// ========================================================================================
// Constants
// ========================================================================================

/** CoinGecko API coin ID mapping for supported tokens */
const COINGECKO_COIN_IDS = {
  SOL: "solana",
  BTC: "bitcoin",
  ETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
} as const;

/** Configuration constants */
const CONFIG = {
  /** Minimum threshold for considering realized PnL as negligible */
  MIN_REALIZED_PNL_THRESHOLD: 0.001,
  /** Number of decimal places for leverage precision */
  LEVERAGE_PRECISION: 4,
  /** Offset for user address in position account data */
  USER_ADDRESS_OFFSET: 8,
} as const;

// ========================================================================================
// Types
// ========================================================================================

/** Result of price fetching operation */
interface PriceFetchResult {
  success: boolean;
  price: BN;
  symbol: string;
}

/** Decoded position account with metadata */
interface DecodedPosition {
  publicKey: PublicKey;
  account: JupiterPositionAccount;
}

/** Position calculation metrics */
interface PositionMetrics {
  sizeUsd: number;
  collateralUsd: number;
  entryPrice: number;
  baseAmount: number;
  markPrice: number;
  pnl: number;
  leverage: number;
}

// ========================================================================================
// Core PnL Calculation (Jupiter Official Method)
// ========================================================================================

/**
 * Calculate PnL for a position using Jupiter's official algorithm
 * @param sizeUsdDelta Position size in USD (as BN)
 * @param positionAvgPrice Average entry price (as BN)
 * @param positionSide Position direction (long/short)
 * @param currentPrice Current market price (as BN)
 * @returns [hasProfit: boolean, pnlAmount: BN]
 */
function calculatePositionPnl(
  sizeUsdDelta: BN,
  positionAvgPrice: BN,
  positionSide: "long" | "short",
  currentPrice: BN,
): [boolean, BN] {
  // No PnL for zero-sized positions
  if (sizeUsdDelta.eqn(0)) {
    return [false, new BN(0)];
  }

  // Determine profit/loss based on price movement and position direction
  const hasProfit = positionSide === "long" ? currentPrice.gt(positionAvgPrice) : positionAvgPrice.gt(currentPrice);

  // Calculate PnL using price delta percentage
  const priceDelta = currentPrice.sub(positionAvgPrice).abs();
  const pnlAmount = sizeUsdDelta.mul(priceDelta).div(positionAvgPrice);

  return [hasProfit, pnlAmount];
}

// ========================================================================================
// Price Fetching
// ========================================================================================

/**
 * Fetch current market price from CoinGecko API
 * @param symbol Token symbol (e.g., "SOL", "BTC")
 * @returns Price fetch result with BN precision
 */
async function fetchCurrentPrice(symbol: string): Promise<PriceFetchResult> {
  try {
    const coinId = COINGECKO_COIN_IDS[symbol as keyof typeof COINGECKO_COIN_IDS];

    if (!coinId) {
      logger.debug(`❌ Unsupported symbol for price fetch: ${symbol}`);
      return { success: false, price: new BN(0), symbol };
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.debug(`❌ CoinGecko API error: ${response.status} ${response.statusText}`);
      return { success: false, price: new BN(0), symbol };
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const usdPrice = data[coinId]?.usd;

    if (!usdPrice || usdPrice <= 0) {
      logger.debug(`❌ Invalid price received for ${symbol}: ${usdPrice}`);
      return { success: false, price: new BN(0), symbol };
    }

    // Convert to BN with USDC precision (6 decimals)
    const priceBN = new BN(Math.round(usdPrice * 10 ** USDC_DECIMALS));

    logger.debug(`💰 Price fetched for ${symbol}: $${usdPrice} (BN: ${priceBN.toString()})`);
    return { success: true, price: priceBN, symbol };
  } catch (error) {
    const details = getErrorDetails(error);
    logger.debug(`❌ Price fetch exception for ${symbol}: ${details.message}`);
    return { success: false, price: new BN(0), symbol };
  }
}

// ========================================================================================
// Position Account Operations
// ========================================================================================

/**
 * Fetch Jupiter position accounts for a user
 * @param userAddress User's wallet address
 * @returns Array of account data with metadata
 */
async function fetchPositionAccounts(userAddress: string) {
  logger.info(`🎯 Fetching Jupiter position accounts for: ${userAddress}`);

  const accountData = await RPC_CONNECTION.getProgramAccounts(JUPITER_PERPETUALS_PROGRAM.programId, {
    commitment: "confirmed",
    filters: [
      {
        memcmp: {
          bytes: new PublicKey(userAddress).toBase58(),
          offset: CONFIG.USER_ADDRESS_OFFSET,
        },
      },
      {
        memcmp: JUPITER_PERPETUALS_PROGRAM.coder.accounts.memcmp("position"),
      },
    ],
  });

  logger.info(`✅ Retrieved ${accountData.length} Jupiter position accounts`);
  return accountData;
}

/**
 * Decode raw position account data
 * @param rawAccounts Array of raw account data
 * @returns Array of decoded position accounts
 */
function decodePositionAccounts(rawAccounts: Awaited<ReturnType<typeof fetchPositionAccounts>>): DecodedPosition[] {
  const decodedPositions: DecodedPosition[] = [];

  for (const item of rawAccounts) {
    try {
      const account = JUPITER_PERPETUALS_PROGRAM.coder.accounts.decode(
        "position",
        item.account.data,
      ) as JupiterPositionAccount;

      decodedPositions.push({
        publicKey: item.pubkey,
        account,
      });
    } catch (error) {
      const details = getErrorDetails(error);
      logger.warn(`⚠️ Failed to decode position ${item.pubkey.toString()}: ${details.message}`);
    }
  }

  logger.info(`✅ Successfully decoded ${decodedPositions.length} position accounts`);
  return decodedPositions;
}

/**
 * Filter for open positions (non-zero size and not NONE side)
 * @param positions Array of decoded positions
 * @returns Array of open positions
 */
function filterOpenPositions(positions: DecodedPosition[]): DecodedPosition[] {
  const openPositions = positions.filter((position) => {
    const hasSize = position.account.sizeUsd?.gtn?.(0) ?? false;
    const sideString = JupiterSideHelpers.toString(position.account.side);
    const isNotNone = sideString !== "NONE";

    return hasSize && isNotNone;
  });

  logger.info(`✅ Filtered to ${openPositions.length} open positions`);
  return openPositions;
}

// ========================================================================================
// Position Processing
// ========================================================================================

/**
 * Calculate position metrics including PnL and leverage
 * @param position Position account data
 * @param marketSymbol Market symbol for price fetching
 * @returns Calculated position metrics
 */
async function calculatePositionMetrics(
  position: JupiterPositionAccount,
  marketSymbol: string,
): Promise<PositionMetrics> {
  // Convert BN values to display format
  const sizeUsd = position.sizeUsd.toNumber() / USD_PRECISION;
  const collateralUsd = position.collateralUsd.toNumber() / USD_PRECISION;
  const entryPrice = position.price.toNumber() / USD_PRECISION;

  // Calculate base asset amount
  const baseAmount = entryPrice > 0 ? sizeUsd / entryPrice : 0;

  // Fetch current market price
  const priceResult = await fetchCurrentPrice(marketSymbol);
  let markPrice = entryPrice;
  let pnl = 0;

  if (priceResult.success && priceResult.price.gtn(0)) {
    // Use current price for mark price
    markPrice = priceResult.price.toNumber() / 10 ** USDC_DECIMALS;

    // Calculate unrealized PnL using Jupiter's official method
    const direction = JupiterSideHelpers.toString(position.side);
    const positionSide = direction.toLowerCase() as "long" | "short";

    const [hasProfit, pnlBN] = calculatePositionPnl(position.sizeUsd, position.price, positionSide, priceResult.price);

    pnl = (hasProfit ? pnlBN.toNumber() : -pnlBN.toNumber()) / USD_PRECISION;

    logger.debug(
      `📊 PnL calculated for ${marketSymbol}: ${hasProfit ? "+" : "-"}$${Math.abs(pnl).toFixed(4)} ` +
        `(current: ${priceResult.price.toString()}, entry: ${position.price.toString()})`,
    );
  } else {
    // Fallback to realized PnL if price fetch fails
    pnl = position.realisedPnlUsd.toNumber() / USD_PRECISION;
    logger.debug(`📊 Using realized PnL for ${marketSymbol}: $${pnl.toFixed(4)} (price unavailable)`);
  }

  // Calculate leverage
  const leverage = collateralUsd > 0 ? sizeUsd / collateralUsd : 1;

  return {
    sizeUsd,
    collateralUsd,
    entryPrice,
    baseAmount,
    markPrice,
    pnl,
    leverage,
  };
}

/**
 * Convert Jupiter position account to standardized Position format
 * @param positionData Decoded position account
 * @returns Standardized Position object or null if invalid
 */
async function processJupiterPosition(positionData: DecodedPosition): Promise<Position | null> {
  const { account: position } = positionData;

  try {
    // Find market configuration by custody address
    const marketInfo = JUPITER_MARKETS.find((market) => market.custody === position.custody.toString());

    if (!marketInfo) {
      logger.warn(`⚠️ Unknown market custody: ${position.custody.toString()}`);
      return null;
    }

    // Get position direction
    const direction = JupiterSideHelpers.toString(position.side);
    if (direction === "NONE") {
      return null; // Skip closed positions
    }

    // Calculate all position metrics
    const metrics = await calculatePositionMetrics(position, marketInfo.symbol);

    // Log position summary
    logger.debug(
      `✅ ${marketInfo.symbol}: $${metrics.entryPrice.toFixed(2)} → $${metrics.markPrice.toFixed(2)}, ` +
        `Size: $${metrics.sizeUsd.toFixed(2)}, Base: ${metrics.baseAmount.toFixed(4)}, ` +
        `PnL: $${metrics.pnl.toFixed(4)}, Leverage: ${metrics.leverage.toFixed(CONFIG.LEVERAGE_PRECISION)}x, ${direction}`,
    );

    return {
      symbol: marketInfo.symbol,
      sizeUsd: metrics.sizeUsd,
      baseAmount: metrics.baseAmount,
      direction: direction as "LONG" | "SHORT",
      pnl: metrics.pnl,
      entryPrice: metrics.entryPrice,
      markPrice: metrics.markPrice,
      leverage: Number(metrics.leverage.toFixed(CONFIG.LEVERAGE_PRECISION)),
      protocolMarketId: position.custody.toString(),
    };
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error(`❌ Position processing error: ${details.message}`);
    return null;
  }
}

// ========================================================================================
// Main Export Function
// ========================================================================================

/**
 * Get user positions from Jupiter Perpetuals protocol
 * @param userAddress User's wallet address
 * @returns Array of standardized Position objects
 */
export async function getJupiterPositions(userAddress: string): Promise<Position[]> {
  try {
    // Step 1: Fetch raw position accounts
    const rawAccounts = await fetchPositionAccounts(userAddress);

    if (rawAccounts.length === 0) {
      logger.info(`⚠️ No Jupiter positions found for: ${userAddress}`);
      return [];
    }

    // Step 2: Decode position data
    const decodedPositions = decodePositionAccounts(rawAccounts);

    // Step 3: Filter for open positions
    const openPositions = filterOpenPositions(decodedPositions);

    if (openPositions.length === 0) {
      logger.info(`ℹ️ No open Jupiter positions for: ${userAddress}`);
      return [];
    }

    // Step 4: Process positions in parallel
    const processedPositions = await Promise.all(openPositions.map(processJupiterPosition));

    // Step 5: Filter out failed processing results
    const validPositions = processedPositions.filter((position): position is Position => position !== null);

    logger.info(
      `🎉 Successfully processed ${validPositions.length}/${openPositions.length} Jupiter positions for: ${userAddress}`,
    );

    return validPositions;
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error(`❌ Jupiter position fetch failed for ${userAddress}: ${details.message}`);
    return [];
  }
}
