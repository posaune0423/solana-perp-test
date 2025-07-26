import * as anchor from "@coral-xyz/anchor";
import {
  BASE_PRECISION,
  BN,
  calculateEntryPrice,
  calculatePositionPNL,
  convertToNumber,
  DriftClient,
  getUserAccountPublicKey,
  initialize,
  isEmptyPosition,
  PerpMarkets,
  type PerpPosition,
  QUOTE_PRECISION,
  User,
  Wallet,
} from "@drift-labs/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { getErrorDetails, logger } from "../utils";

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

/**
 * Get user positions from Drift protocol
 */
export async function getDriftPositions(
  userAddress: string,
  rpcUrl: string = "https://api.mainnet-beta.solana.com",
): Promise<Position[]> {
  logger.info(`🎯 Starting position fetch for: ${userAddress}`);

  // Initialize connection and client
  const driftClient = await initializeClient(rpcUrl);
  const user = await createUser(driftClient, userAddress);

  // Check account existence
  if (!(await user.exists())) {
    logger.info(`⚠️ No Drift account found for address: ${userAddress}`);
    return [];
  }

  try {
    // Get user data
    await user.subscribe();
    const userAccount = user.getUserAccount();
    const positions = userAccount.perpPositions.filter((pos: PerpPosition) => !isEmptyPosition(pos));

    logger.info(`✅ Found ${positions.length} positions`);

    if (positions.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(positions.map((position) => processPosition(position, driftClient)));

    logger.info(`🎉 Successfully processed ${results.length} positions`);
    return results.reduce((acc, result) => {
      if (result.status === "fulfilled" && result.value !== null) {
        acc.push(result.value);
      }
      return acc;
    }, [] as Position[]);
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error(`❌ Error: ${details.message}`);
    throw error;
  } finally {
    await cleanup(user, driftClient);
  }
}

/**
 * Initialize Drift client
 */
async function initializeClient(rpcUrl: string): Promise<DriftClient> {
  logger.debug(`🚀 Initializing client: ${rpcUrl}`);

  const connection = new Connection(rpcUrl, "confirmed");
  const version = await connection.getVersion();
  logger.debug(`✅ RPC connection successful: ${version["solana-core"]}`);

  const config = initialize({ env: "mainnet-beta" });
  const wallet = new Wallet(anchor.web3.Keypair.generate());

  const client = new DriftClient({
    connection,
    wallet,
    programID: new PublicKey(config.DRIFT_PROGRAM_ID),
  });

  await client.subscribe();
  logger.debug("✅ Client initialization completed");
  return client;
}

/**
 * Create user instance
 */
async function createUser(driftClient: DriftClient, userAddress: string): Promise<User> {
  const userPubkey = new PublicKey(userAddress);
  const userAccountPubkey = await getUserAccountPublicKey(driftClient.program.programId, userPubkey, 0);

  return new User({
    driftClient,
    userAccountPublicKey: userAccountPubkey,
    accountSubscription: { type: "websocket" },
  });
}

/**
 * Process single position
 */
async function processPosition(position: PerpPosition, driftClient: DriftClient): Promise<Position | null> {
  try {
    const marketIndex = position.marketIndex;
    logger.debug(`🔍 Processing market ${marketIndex}`);

    // Get market information
    const marketInfo = PerpMarkets["mainnet-beta"].find((m) => m.marketIndex === marketIndex);
    if (!marketInfo) {
      logger.warn(`⚠️ Market info not found: ${marketIndex}`);
      return null;
    }

    // Get price and account information
    const marketAccount = driftClient.getPerpMarketAccount(marketIndex);
    const oracleData = driftClient.getOracleDataForPerpMarket(marketIndex);

    if (!marketAccount) {
      logger.warn(`⚠️ Market account not found: ${marketIndex}`);
      return null;
    }

    // Calculate position metrics
    const baseAmount = convertToNumber(position.baseAssetAmount, BASE_PRECISION);
    const quoteAmount = convertToNumber(position.quoteAssetAmount, QUOTE_PRECISION);
    const direction = position.baseAssetAmount.gt(new BN(0)) ? "LONG" : "SHORT";

    const pnl = convertToNumber(calculatePositionPNL(marketAccount, position, false, oracleData), QUOTE_PRECISION);
    const entryPrice = convertToNumber(calculateEntryPrice(position), QUOTE_PRECISION);
    const markPrice = convertToNumber(oracleData.price, QUOTE_PRECISION);

    // Calculate leverage (notional value / margin)
    const notionalValue = Math.abs(baseAmount) * markPrice;
    const margin = Math.abs(quoteAmount);
    const leverage = margin > 0 ? notionalValue / margin : 0;

    logger.debug(
      `✅ ${marketInfo.baseAssetSymbol}: $${entryPrice} → $${markPrice}, PnL: $${pnl}, Leverage: ${leverage.toFixed(2)}x`,
    );

    return {
      marketIndex,
      symbol: marketInfo.baseAssetSymbol,
      size: Math.abs(baseAmount),
      direction,
      pnl,
      entryPrice,
      markPrice,
      leverage: Number(leverage.toFixed(2)),
    };
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error(`❌ Position processing error (market: ${position.marketIndex}): ${details.message}`);
    return null;
  }
}

/**
 * Cleanup resources
 */
async function cleanup(user?: User, driftClient?: DriftClient): Promise<void> {
  if (user) {
    try {
      await user.unsubscribe();
      logger.debug("✅ User subscription stopped");
    } catch (error) {
      logger.debug(`⚠️ User cleanup error: ${getErrorDetails(error).message}`);
    }
  }

  if (driftClient) {
    try {
      await driftClient.unsubscribe();
      logger.debug("✅ Client disconnected");
    } catch (error) {
      logger.debug(`⚠️ Client cleanup error: ${getErrorDetails(error).message}`);
    }
  }
}
