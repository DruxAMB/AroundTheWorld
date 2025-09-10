import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import crypto from "crypto";

// @ts-ignore
if (!global.crypto) global.crypto = crypto;

// Create a singleton instance of the CDP client only on server side
let cdpClient: CdpClient | null = null;

// Initialize CDP client only on server side (for AI agent operations)
if (typeof window === 'undefined') {
  try {
    cdpClient = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });
    console.log('✅ CDP client initialized for server-side operations');
  } catch (error) {
    console.error('❌ Failed to initialize CDP client:', error);
  }
}

// Export the singleton instance (null on client-side)
export const cdp = cdpClient;

// Export the client type for type safety
export type CDPClient = typeof cdpClient;
