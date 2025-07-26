export * from "./error";
export * from "./logger";

import { BN } from "@coral-xyz/anchor";

/**
 * Convert BN to USD representation string
 */
export function BNToUSDRepresentation(amount: BN, decimals: number): string {
  const divisor = new BN(10).pow(new BN(decimals));
  const dollars = amount.div(divisor);
  const cents = amount.mod(divisor);

  // Handle negative numbers
  const isNegative = amount.isNeg();
  const absoluteDollars = dollars.abs();
  const absoluteCents = cents.abs();

  // Format to 2 decimal places
  const centsStr = absoluteCents.mul(new BN(100)).div(divisor).toString().padStart(2, "0");
  const result = `${absoluteDollars.toString()}.${centsStr}`;

  return isNegative ? `-$${result}` : `$${result}`;
}
