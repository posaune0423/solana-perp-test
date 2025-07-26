import { PublicKey } from "@solana/web3.js";
import { JUPITER_MARKETS, JUPITER_PERPETUALS_PROGRAM, RPC_CONNECTION, USD_PRECISION } from "../constants";
import type { Position } from "../types";
import type { JupiterPositionAccount } from "../types/jupiter";
import { JupiterSideHelpers } from "../types/jupiter";
import { getErrorDetails, logger } from "../utils";

/**
 * Get user positions from Jupiter Perps protocol
 * Implementation using reference repository pattern with accurate type-safe data
 */
export async function getJupiterPositions(userAddress: string): Promise<Position[]> {
  logger.info(`🎯 Starting Jupiter position fetch for: ${userAddress}`);

  try {
    // Get program accounts using the exact pattern from reference repo
    const gpaResult = await RPC_CONNECTION.getProgramAccounts(JUPITER_PERPETUALS_PROGRAM.programId, {
      commitment: "confirmed",
      filters: [
        // Filter by wallet address
        {
          memcmp: {
            bytes: new PublicKey(userAddress).toBase58(),
            offset: 8,
          },
        },
        // Filter by position account type using Anchor coder
        {
          memcmp: JUPITER_PERPETUALS_PROGRAM.coder.accounts.memcmp("position"),
        },
      ],
    });

    if (gpaResult.length === 0) {
      logger.info(`⚠️ No Jupiter positions found for address: ${userAddress}`);
      return [];
    }

    logger.info(`✅ Found ${gpaResult.length} Jupiter position accounts`);

    // Decode positions using Anchor coder (reference repo pattern)
    const positions = gpaResult
      .map((item) => {
        try {
          return {
            publicKey: item.pubkey,
            account: JUPITER_PERPETUALS_PROGRAM.coder.accounts.decode(
              "position",
              item.account.data,
            ) as JupiterPositionAccount,
          };
        } catch (error) {
          const details = getErrorDetails(error);
          logger.warn(`Failed to decode position ${item.pubkey.toString()}: ${details.message}`);
          return null;
        }
      })
      .filter((pos): pos is { publicKey: PublicKey; account: JupiterPositionAccount } => pos !== null);

    // Filter for open positions (sizeUsd > 0) - reference repo pattern
    const openPositions = positions.filter((position) => position.account.sizeUsd?.gtn?.(0));

    logger.info(`✅ Found ${openPositions.length} open Jupiter positions`);

    if (openPositions.length === 0) {
      return [];
    }

    // Process positions to our standard format
    const processedPositions = openPositions
      .map((position) => processJupiterPosition(position.account))
      .filter((pos): pos is Position => pos !== null);

    logger.info(`🎉 Successfully processed ${processedPositions.length} Jupiter positions`);
    return processedPositions;
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error(`❌ Jupiter position fetch error: ${details.message}`);
    return [];
  }
}

/**
 * Process single Jupiter position account to our standard Position format
 * Using accurate type-safe Jupiter position data
 */
function processJupiterPosition(positionAccount: JupiterPositionAccount): Position | null {
  try {
    // Find market info by custody
    const marketInfo = JUPITER_MARKETS.find((market) => market.custody === positionAccount.custody.toString());

    if (!marketInfo) {
      logger.warn(`⚠️ Market info not found for custody: ${positionAccount.custody.toString()}`);
      return null;
    }

    // Convert BN values to numbers with proper precision
    const sizeUsd = positionAccount.sizeUsd.toNumber() / USD_PRECISION;
    const collateralUsd = positionAccount.collateralUsd.toNumber() / USD_PRECISION;
    const realizedPnl = positionAccount.realisedPnlUsd.toNumber() / USD_PRECISION;
    const entryPrice = positionAccount.price.toNumber() / USD_PRECISION;

    // Use type-safe side conversion
    const sideString = JupiterSideHelpers.toString(positionAccount.side);

    // Skip NONE positions (closed positions)
    if (sideString === "NONE") {
      return null;
    }

    const direction = sideString; // Now guaranteed to be "LONG" | "SHORT"

    // Calculate leverage (position size / collateral)
    const leverage = collateralUsd > 0 ? sizeUsd / collateralUsd : 1;

    // Use entry price as mark price (simplified)
    const markPrice = entryPrice;

    logger.debug(
      `✅ ${marketInfo.symbol}: $${entryPrice.toFixed(2)}, Size: $${sizeUsd.toFixed(2)}, PnL: $${realizedPnl.toFixed(2)}, Leverage: ${leverage.toFixed(2)}x, ${direction}`,
    );

    return {
      marketIndex: marketInfo.marketIndex,
      symbol: marketInfo.symbol,
      size: sizeUsd,
      direction,
      pnl: realizedPnl, // Using realized PnL as it's what's available in the IDL
      entryPrice,
      markPrice,
      leverage: Number(leverage.toFixed(2)),
    };
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error(`❌ Jupiter position processing error: ${details.message}`);
    return null;
  }
}
