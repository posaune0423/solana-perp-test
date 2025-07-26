# Drift Protocol Position Fetcher

A TypeScript tool to fetch open positions from Drift Protocol (Solana perpetual futures DEX) on mainnet using the official SDK.

## Features

- Fetch all open positions for a specified Solana wallet address (Mainnet only)
- Display detailed position information:
  - Market symbol (SOL-PERP, BTC-PERP, etc.)
  - Position direction (LONG/SHORT)
  - Position size and leverage
  - Entry price and current mark price
  - Unrealized PnL
  - Quote amount

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configuration

Update the configuration in `src/constants.ts`:

```typescript
export const USER_ADDRESS = 'YOUR_WALLET_ADDRESS_HERE';
export const RPC_URL = 'https://api.mainnet-beta.solana.com';
```

### 3. Run

```bash
# Development mode (auto-restart on file changes)
bun dev

# Production run
bun start

# Lint code
bun run lint
```

## Usage Example

```typescript
import { getDriftPositions } from './lib/drift';

// Fetch positions from mainnet
const positions = await getDriftPositions(
    'YourWalletAddressHere',
    'https://api.mainnet-beta.solana.com' // or a faster RPC URL
);

console.log('Open positions:', positions);
```

## API Reference

### `getDriftPositions(userAddress, rpcUrl?)`

Retrieves open positions for the specified address on mainnet.

**Parameters:**
- `userAddress` (string): Solana wallet address or Drift account authority
- `rpcUrl` (string, optional): Solana RPC URL. Default: mainnet URL

**Returns:**
```typescript
interface Position {
    marketIndex: number;          // Market index
    symbol: string;               // Market symbol (SOL, BTC, etc.)
    size: number;                 // Position size
    direction: 'LONG' | 'SHORT';  // Position direction
    pnl: number;                  // Unrealized PnL
    entryPrice: number;           // Entry price
    markPrice: number;            // Current mark price
    leverage: number;             // Position leverage (e.g., 5.2)
}
```

## RPC Configuration

### Recommended RPC Providers
- **Free**: `https://api.mainnet-beta.solana.com` (rate limited)
- **Paid**: QuickNode, Alchemy, Helius (recommended for production)

### Why Use Premium RPC?
1. Higher rate limits
2. Faster response times
3. Better reliability
4. Additional features

```typescript
// Example using QuickNode
const positions = await getDriftPositions(
    userAddress,
    'https://your-quicknode-endpoint.solana.rpcpool.com/'
);
```

## Requirements

1. **Drift Account**: The specified address must have initialized a Drift Protocol account
2. **RPC Access**: Free RPCs have rate limits; consider premium RPCs for heavy usage
3. **Mainnet Only**: This tool only fetches mainnet data

## Error Handling

Common errors and solutions:

- **"No Drift account found"**: The address hasn't created a Drift account
- **Connection errors**: Check RPC URL and network connectivity
- **Rate limit errors**: Consider using a premium RPC service

## Technical Details

- **Drift SDK**: v2.130.0-beta.1
- **Solana Web3.js**: Latest version
- **Anchor**: For Solana program interactions
- **TypeScript**: Type safety throughout
- **Target Network**: Solana Mainnet
- **Logger**: Structured logging with colored output and timestamps

### Logging

The application uses structured logging with color-coded output:

- `logger.info()`: General information (blue)
- `logger.debug()`: Debug messages (cyan)
- `logger.warn()`: Warning messages (yellow)
- `logger.error()`: Error messages (red)

All logs include automatic timestamps and log levels.

## Sample Output

```
🚀 Starting Drift Protocol position fetch...
🎯 Starting position fetch for: YourAddressHere
✅ Found 2 positions

📈 Position 1:
  💱 Market: SOL (Index: 0)
  📊 Direction: LONG
  📏 Size: 1.500000
  🎯 Entry Price: $180.50
  💰 Current Price: $185.20
  💸 Unrealized PnL: $7.05
  ⚡ Leverage: 5.2x

📈 Position 2:
  💱 Market: BTC (Index: 1)
  📊 Direction: SHORT
  📏 Size: 0.025000
  🎯 Entry Price: $68500.00
  💰 Current Price: $67200.00
  💸 Unrealized PnL: $32.50
  ⚡ Leverage: 3.1x

💰 Total Unrealized PnL: $39.55
```

## Code Architecture

The codebase follows TypeScript best practices:

- **Simple API**: Single main function `getDriftPositions()`
- **Clean separation**: Utilities, constants, and business logic in separate modules
- **Error handling**: Comprehensive error handling with detailed logging
- **Type safety**: Full TypeScript interfaces and type checking
- **Resource management**: Proper cleanup of connections and subscriptions

## Troubleshooting

### Q: No positions are displayed
A: Check the following:
- Verify the wallet address is correct
- Ensure the address has a Drift account created
- Confirm there are currently open positions
- Make sure you're querying mainnet

### Q: Connection errors
A: Try the following:
- Verify the RPC URL is correct
- Check your internet connection
- Consider using a premium RPC service
- Check if you've hit rate limits

### Q: Slow responses
A: Consider these solutions:
- Use a faster premium RPC service
- Limit concurrent requests
- Implement appropriate timeout settings

## Contributing

1. Follow the existing code style
2. Use TypeScript best practices
3. Add appropriate error handling
4. Include comprehensive logging
5. Test thoroughly before submitting

## References

- [Drift Protocol](https://www.drift.trade/)
- [Drift SDK Documentation](https://drift-labs.github.io/protocol-v2/sdk/)
- [Solana Documentation](https://docs.solana.com/)

---

Built with ❤️ using [Bun](https://bun.sh)
