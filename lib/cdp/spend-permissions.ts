import {
  requestSpendPermission,
  prepareSpendCallData,
  fetchPermissions,
  getPermissionStatus,
  requestRevoke,
} from '@base-org/account/spend-permission'
import { createBaseAccountSDK } from '@base-org/account'

export interface SpendPermission {
  signature: string
  permission: {
    account: string
    spender: string
    token: string
    allowance: string
    period: number
    start: number
    end: number
    salt: string
    extraData: string
  }
}

export const ETH_BASE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export async function requestUserSpendPermission(
  userAccount: string,
  spenderAccount: string,
  dailyLimitUSD: number = 2
): Promise<SpendPermission> {
  try {
    // Convert USD to USDC (6 decimals)
    const allowanceUSDC = BigInt(dailyLimitUSD * 1_000_000)

    const permission = await requestSpendPermission({
      account: userAccount as `0x${string}`,
      spender: spenderAccount as `0x${string}`,
      token: ETH_BASE_ADDRESS as `0x${string}`,
      chainId: 84532, // Base mainnet
      allowance: allowanceUSDC,
      periodInDays: 1, // Daily limit
      provider: createBaseAccountSDK({
        appName: "AroundTheWorld Game",
      }).getProvider(),
    })

    return permission as SpendPermission
  } catch (error) {
    console.error('Failed to request spend permission:', error)
    throw new Error('Failed to request spend permission')
  }
}

export async function getUserSpendPermissions(
  userAccount: string,
  spenderAccount: string
): Promise<Record<string, unknown>[]> {
  try {
    console.log('🔧 Creating Base Account SDK...')
    const sdk = createBaseAccountSDK({
      appName: "AroundTheWorld Game",
    })
    const provider = sdk.getProvider()
    console.log('✅ SDK and provider created')

    console.log('📡 Calling fetchPermissions with:')
    console.log('  - account:', userAccount)
    console.log('  - chainId: 84532')
    console.log('  - spender:', spenderAccount)
    console.log('  - ETH_BASE_ADDRESS:', ETH_BASE_ADDRESS)

    const permissions = await fetchPermissions({
      account: userAccount as `0x${string}`,
      chainId: 84532,
      spender: spenderAccount as `0x${string}`,
      provider,
    })

    console.log('📋 Raw fetchPermissions result:', permissions)
    console.log('📊 Total permissions returned:', permissions.length)

    // Log each permission before filtering
    if (permissions.length > 0) {
      permissions.forEach((permission, index) => {
        const tokenAddress = permission.permission?.token?.toLowerCase()
        const usdcAddress = ETH_BASE_ADDRESS.toLowerCase()
        console.log(`🔍 Permission ${index + 1} before filtering:`, {
          token: permission.permission?.token,
          tokenLowercase: tokenAddress,
          usdcLowercase: usdcAddress,
          isUSDC: tokenAddress === usdcAddress,
          allowance: permission.permission?.allowance?.toString(),
          account: permission.permission?.account,
          spender: permission.permission?.spender,
        })
      })
    }

    const filteredPermissions = permissions.filter(p => 
      p.permission?.token?.toLowerCase() === ETH_BASE_ADDRESS.toLowerCase()
    )
    console.log('✅ Filtered USDC permissions:', filteredPermissions.length)

    return filteredPermissions
  } catch (error) {
    console.error('❌ Failed to fetch spend permissions:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}

export async function checkSpendPermissionStatus(permission: SpendPermission) {
  try {
    const status = await getPermissionStatus(permission)
    return status
  } catch (error) {
    console.error('Failed to check permission status:', error)
    return { isActive: false, remainingSpend: BigInt(0) }
  }
}

export async function prepareSpendTransaction(
  permission: SpendPermission,
  amountUSD: number
) {
  try {
    // Convert USD to USDC (6 decimals)
    const amountUSDC = BigInt(Math.floor(amountUSD * 1_000_000))

    const spendCalls = await prepareSpendCallData(permission, amountUSDC)

    return spendCalls
  } catch (error) {
    console.error('Failed to prepare spend transaction:', error)
    throw new Error('Failed to prepare spend transaction')
  }
}

export async function revokeSpendPermission(permission: Record<string, unknown>): Promise<string> {
  try {
    console.log('🔄 Revoking spend permission:', permission)
    
    // Ensure the permission object has the correct structure for requestRevoke
    const normalizedPermission = {
      permission: permission,
      provider: createBaseAccountSDK({
        appName: "AroundTheWorld Game",
      }).getProvider(),
    }
    
    console.log('🔧 Normalized permission for revoke:', normalizedPermission)
    
    // Use requestRevoke for user-initiated revoke (shows wallet popup)
    // Type assertion needed due to SDK interface mismatch
    const result = await requestRevoke(normalizedPermission as never)
    
    console.log('✅ Spend permission revoked successfully, result:', result)
    console.log('🔍 Result type:', typeof result)
    console.log('🔍 Result structure:', result)
    
    // requestRevoke returns an object with an 'id' property containing the transaction hash
    const hash: string = (result as unknown as { id: string }).id
    
    console.log('✅ Final hash:', hash)
    return hash
  } catch (error) {
    console.error('❌ Failed to revoke spend permission:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      permission: permission
    })
    throw new Error(`Failed to revoke spend permission: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
