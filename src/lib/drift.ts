import * as anchor from "@coral-xyz/anchor";
import {
  DriftClient,
  getUserAccountPublicKey,
  initialize,
  isEmptyPosition,
  type PerpPosition,
  User,
  Wallet,
} from "@drift-labs/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { getErrorDetails, logger } from "../utils";

/**
 * Get user positions from Drift protocol
 */
export async function getDriftPositions(
  userAddress: string,
  rpcUrl: string = "https://api.mainnet-beta.solana.com",
): Promise<PerpPosition[]> {
  logger.info(`🎯 Starting position fetch for: ${userAddress}`);

  let driftClient: DriftClient | undefined;
  let user: User | undefined;

  try {
    // Initialize connection and client
    driftClient = await initializeClient(rpcUrl);
    user = await createUser(driftClient, userAddress);

    // Check account existence
    if (!(await user.exists())) {
      logger.info(`⚠️ No Drift account found for address: ${userAddress}`);
      return [];
    }

    // Get user data
    await user.subscribe();
    const userAccount = user.getUserAccount();
    const positions = userAccount.perpPositions.filter((pos) => !isEmptyPosition(pos));

    logger.info(`✅ Found ${positions.length} positions`);

    if (positions.length === 0) {
      return [];
    }

    return positions;
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
