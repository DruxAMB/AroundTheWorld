import {
  requestSpendPermission,
  prepareSpendCallData,
  fetchPermissions,
  getPermissionStatus,
  requestRevoke,
} from '@base-org/account/spend-permission';
import { createBaseAccountSDK } from '@base-org/account';

export interface SpendPermission {
  account: string;
  spender: string;
  token: string;
  chainId: number;
  allowance: bigint;
  periodInDays: number;
  signature?: string;
}

export const USDC_BASE_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function requestUserSpendPermission(
  userAccount: string,
  spenderAccount: string,
  dailyLimitETH: number = 0.01
): Promise<SpendPermission> {
  try {
    // Convert ETH to wei (18 decimals)
    const allowanceWei = BigInt(Math.floor(dailyLimitETH * 1e18));

    const permission = await requestSpendPermission({
      account: userAccount as `0x${string}`,
      spender: spenderAccount as `0x${string}`,
      token: ETH_ADDRESS as `0x${string}`,
      chainId: 8453, // Base mainnet
      allowance: allowanceWei,
      periodInDays: 1, // Daily limit
      provider: createBaseAccountSDK({
        appName: "AroundTheWorld Game",
      }).getProvider(),
    });

    return {
      account: userAccount,
      spender: spenderAccount,
      token: ETH_ADDRESS,
      chainId: 8453,
      allowance: allowanceWei,
      periodInDays: 1,
      ...permission
    };
  } catch (error) {
    console.error('Failed to request spend permission:', error);
    throw new Error('Failed to request spend permission');
  }
}

export async function getUserSpendPermissions(
  userAccount: string,
  spenderAccount: string
) {
  try {
    console.log('🔧 Creating Base Account SDK...');
    const sdk = createBaseAccountSDK({
      appName: "AroundTheWorld Game",
    });
    const provider = sdk.getProvider();
    console.log('✅ SDK and provider created');

    console.log('📡 Calling fetchPermissions with:');
    console.log('  - account:', userAccount);
    console.log('  - chainId: 8453');
    console.log('  - spender:', spenderAccount);
    console.log('  - ETH_ADDRESS:', ETH_ADDRESS);

    const permissions = await fetchPermissions({
      account: userAccount as `0x${string}`,
      chainId: 8453,
      spender: spenderAccount as `0x${string}`,
      provider,
    });

    console.log('📋 Raw fetchPermissions result:', permissions);
    console.log('📊 Total permissions returned:', permissions.length);

    // Log each permission before filtering
    if (permissions.length > 0) {
      permissions.forEach((permission, index) => {
        const tokenAddress = permission.permission?.token?.toLowerCase();
        const ethAddress = ETH_ADDRESS.toLowerCase();
        console.log(`🔍 Permission ${index + 1} before filtering:`, {
          token: permission.permission?.token,
          tokenLowercase: tokenAddress,
          ethLowercase: ethAddress,
          isETH: tokenAddress === ethAddress,
          allowance: permission.permission?.allowance?.toString(),
          account: permission.permission?.account,
          spender: permission.permission?.spender,
        });
      });
    }

    const filteredPermissions = permissions.filter(p => 
      p.permission?.token?.toLowerCase() === ETH_ADDRESS.toLowerCase()
    );
    console.log('✅ Filtered ETH permissions:', filteredPermissions.length);

    return filteredPermissions;
  } catch (error) {
    console.error('❌ Failed to fetch spend permissions:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

export async function checkSpendPermissionStatus(permission: any) {
  try {
    const status = await getPermissionStatus(permission);
    return status;
  } catch (error) {
    console.error('Failed to check permission status:', error);
    return { isActive: false, remainingSpend: BigInt(0) };
  }
}

export async function prepareSpendTransaction(
  permission: any,
  amountETH: number
) {
  try {
    // Convert ETH to wei (18 decimals)
    const amountWei = BigInt(Math.floor(amountETH * 1e18));

    const spendCalls = await prepareSpendCallData(permission, amountWei);

    return spendCalls;
  } catch (error) {
    console.error('Failed to prepare spend transaction:', error);
    throw new Error('Failed to prepare spend transaction');
  }
}

export async function revokeSpendPermission(permission: any): Promise<string> {
  try {
    console.log('🔄 Revoking spend permission:', permission);
    
    // Ensure the permission object has the correct structure for requestRevoke
    const normalizedPermission = {
      permission: permission,
      provider: createBaseAccountSDK({
        appName: "AroundTheWorld Game",
      }).getProvider(),
    };
    
    console.log('🔧 Normalized permission for revoke:', normalizedPermission);
    
    // Use requestRevoke for user-initiated revoke (shows wallet popup)
    const result = await requestRevoke(normalizedPermission);
    
    console.log('✅ Spend permission revoked successfully, result:', result);
    console.log('🔍 Result type:', typeof result);
    console.log('🔍 Result structure:', result);
    
    // requestRevoke returns an object with an 'id' property containing the transaction hash
    const hash: string = (result as any).id;
    
    console.log('✅ Final hash:', hash);
    return hash;
  } catch (error) {
    console.error('❌ Failed to revoke spend permission:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      permission: permission
    });
    throw new Error(`Failed to revoke spend permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
