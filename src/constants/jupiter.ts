import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { IDL } from "./idl/jupiter";

// RPC Connection (matching reference repo pattern)
export const RPC_CONNECTION = new Connection(
  process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com",
);

export const JUPITER_PERPETUALS_PROGRAM_ID = new PublicKey("PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu");

export const JLP_POOL_ACCOUNT_PUBKEY = new PublicKey("5BUwFW4nRbftYTDMbgxykoFWqWHPzahFSNAaaaJtVKsq");

// Direct Program instantiation (exact reference repo pattern)
export const JUPITER_PERPETUALS_PROGRAM = new Program(
  IDL,
  JUPITER_PERPETUALS_PROGRAM_ID,
  new AnchorProvider(RPC_CONNECTION, new Wallet(Keypair.generate()), AnchorProvider.defaultOptions()),
);

export enum CUSTODY_PUBKEY {
  SOL = "7xS2gz2bTp3fwCC7knJvUWTEU9Tycczu6VhJYKgi1wdz",
  ETH = "AQCGyheWPLeo6Qp9WpYS9m3Qj479t7R636N9ey1rEjEn",
  BTC = "5Pv3gM9JrFFH883SWAhvJC9RPYmo8UNxuFtv5bMMALkm",
  USDC = "G18jKKXQwBbrHeiK3C9MRXhkHsLHf7XgCSisykV46EZa",
  USDT = "4vkNeXiYEUizLdrpdPS1eC2mccyM4NUPRtERrk6ZETkk",
}

export const CUSTODY_PUBKEYS = [
  new PublicKey(CUSTODY_PUBKEY.SOL),
  new PublicKey(CUSTODY_PUBKEY.BTC),
  new PublicKey(CUSTODY_PUBKEY.ETH),
  new PublicKey(CUSTODY_PUBKEY.USDC),
  new PublicKey(CUSTODY_PUBKEY.USDT),
];

// Jupiter Perps market information
export const JUPITER_MARKETS = [
  { symbol: "SOL", custody: CUSTODY_PUBKEY.SOL, marketIndex: 0 },
  { symbol: "BTC", custody: CUSTODY_PUBKEY.BTC, marketIndex: 1 },
  { symbol: "ETH", custody: CUSTODY_PUBKEY.ETH, marketIndex: 2 },
  { symbol: "USDC", custody: CUSTODY_PUBKEY.USDC, marketIndex: 3 },
  { symbol: "USDT", custody: CUSTODY_PUBKEY.USDT, marketIndex: 4 },
];

// Precision constants
export const USDC_DECIMALS = 6;
export const USD_PRECISION = 1e6; // Jupiter uses 6 decimals for USD values
export const BPS_POWER = new BN(10_000);
export const DBPS_POWER = new BN(100_000);
export const RATE_POWER = new BN(1_000_000_000);

// Backwards compatibility
export const RPC_URL = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

export function createRpcConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, "confirmed");
}
