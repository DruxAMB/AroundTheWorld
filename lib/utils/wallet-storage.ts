// Client-side only - no fs imports allowed
interface WalletStorage {
  address: string;
  smartAccountAddress: string;
  createdAt: string;
}

// Client-side version that fetches from API
export async function getRewardDistributorAddressesClient(): Promise<WalletStorage> {
  try {
    const response = await fetch('/api/wallet/addresses');
    if (!response.ok) {
      throw new Error('Failed to fetch wallet addresses');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch wallet addresses:', error);
    throw error;
  }
}
