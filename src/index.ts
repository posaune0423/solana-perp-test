import { RPC_URL, USER_ADDRESS } from "./constants";
import { getDriftPositions } from "./lib/drift";
import { handleFetchError, logger } from "./utils";

async function fetchDriftPositions() {
  try {
    // Get positions using simple API
    const positions = await getDriftPositions(USER_ADDRESS, RPC_URL);

    if (positions.length === 0) {
      logger.info("📭 No open positions found");
      return;
    }

    logger.info(`🎯 Found ${positions.length} open positions:`);

    logger.info(positions);

    // Calculate total PnL
    const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    logger.info(`\n💰 Total Unrealized PnL: $${totalPnl.toFixed(2)}`);
  } catch (error) {
    handleFetchError(error);
  }
}

async function main() {
  logger.info("🚀 Starting Drift Protocol position fetch...");
  await fetchDriftPositions();
}

main()
  .catch(logger.error)
  .finally(() => {
    process.exit(0);
  });
