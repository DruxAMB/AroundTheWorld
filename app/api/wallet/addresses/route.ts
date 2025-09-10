import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface WalletStorage {
  address: string;
  smartAccountAddress: string;
  createdAt: string;
}

function getRewardDistributorAddresses(): WalletStorage {
  try {
    const WALLET_STORAGE_PATH = path.join(process.cwd(), '.wallet-storage.json');
    if (fs.existsSync(WALLET_STORAGE_PATH)) {
      const data = fs.readFileSync(WALLET_STORAGE_PATH, 'utf8');
      const storage = JSON.parse(data);
      
      // Handle both old format (direct properties) and new format (nested rewardDistributor)
      if (storage.rewardDistributor) {
        return storage.rewardDistributor;
      } else if (storage.address && storage.smartAccountAddress) {
        return storage;
      }
    }
  } catch (error) {
    console.error('Failed to load wallet storage:', error);
  }
  
  throw new Error('No reward distributor wallet found in storage');
}

export async function GET() {
  try {
    const addresses = getRewardDistributorAddresses();
    return NextResponse.json(addresses);
  } catch (error) {
    console.error('Failed to get wallet addresses:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet addresses' },
      { status: 500 }
    );
  }
}
