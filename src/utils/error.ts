import { logger } from "./logger";

/**
 * Helper function to extract error details
 */
export function getErrorDetails(error: unknown): { message: string; stack?: string; code?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as unknown as { code: string }).code,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (error && typeof error === "object") {
    return {
      message: (error as unknown as { message: string }).message || "Unknown error",
      code: (error as unknown as { code: string }).code,
    };
  }
  return { message: String(error) };
}

export function handleFetchError(error: unknown): void {
  logger.error("Error fetching positions:", error);

  if (error instanceof Error) {
    if (error.message.includes("410") || error.message.includes("Gone")) {
      logger.error("→ RPC method disabled or rate limited");
      logger.error("→ Try using a paid RPC service (QuickNode, Alchemy, etc.)");
    } else if (error.message.includes("getUserAccountPublicKey")) {
      logger.error("→ Make sure the user address has initialized a Drift account");
    } else if (error.message.includes("connection") || error.message.includes("timeout")) {
      logger.error("→ Network connection issue");
    } else if (error.message.includes("-32401") || error.message.includes("Batch requests")) {
      logger.error("→ RPC batch requests not allowed - using direct fetching instead");
    }
  }
}
