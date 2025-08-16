// Contract integration for PlayerRegistry
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// PlayerRegistry contract ABI (from deployed contract)
export const PLAYER_REGISTRY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "playerAddress",
        "type": "address"
      }
    ],
    "name": "PlayerRegistered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getTotalPlayers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "playerAddress",
        "type": "address"
      }
    ],
    "name": "isRegistered",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "players",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Contract address - Deployed on Base mainnet
export const PLAYER_REGISTRY_ADDRESS = '0x654a8aa6edf449f92229231b9754404bf22b9ade' as const;

// Public client for reading from the contract
export const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

// Helper function to check if a player is registered
export async function isPlayerRegistered(address: `0x${string}`): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: PLAYER_REGISTRY_ADDRESS,
      abi: PLAYER_REGISTRY_ABI,
      functionName: 'isRegistered',
      args: [address]
    });
    return result;
  } catch (error) {
    console.error('Error checking player registration:', error);
    return false;
  }
}

// Helper function to get total number of registered players
export async function getTotalPlayers(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: PLAYER_REGISTRY_ADDRESS,
      abi: PLAYER_REGISTRY_ABI,
      functionName: 'getTotalPlayers'
    });
    return Number(result);
  } catch (error) {
    console.error('Error getting total players:', error);
    return 0;
  }
}

// Helper function to register a new player (requires wallet connection)
export async function registerPlayer(walletClient: any): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const { request } = await publicClient.simulateContract({
      address: PLAYER_REGISTRY_ADDRESS,
      abi: PLAYER_REGISTRY_ABI,
      functionName: 'register',
      account: walletClient.account
    });

    const hash = await walletClient.writeContract(request);
    
    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash 
    });
    
    return receipt.status === 'success';
  } catch (error) {
    console.error('Error registering player:', error);
    return false;
  }
}
