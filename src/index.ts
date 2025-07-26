import { USER_ADDRESS } from "./constants";
import { getDriftPositions } from "./lib/drift";
import { getJupiterPositions } from "./lib/jupiter";
import { logger } from "./utils";

async function main() {
  try {
    logger.info("🚀 Starting Drift Protocol position fetch...");
    const driftPositions = await getDriftPositions(USER_ADDRESS);

    logger.info("🚀 Starting Jupiter Protocol position fetch...");
    const jupiterPositions = await getJupiterPositions(USER_ADDRESS);

    // Combine all positions
    const allPositions = [...driftPositions, ...jupiterPositions];

    logger.info(`🎯 Found ${allPositions.length} open positions:`);
    logger.info(allPositions);

    // Calculate total unrealized PnL
    const totalPnl = allPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    logger.info(`\n💰 Total Unrealized PnL: $${totalPnl.toFixed(2)}`);
  } catch (error) {
    logger.error("❌ Error in main:", error);
    process.exit(1);
  }
}

main();
