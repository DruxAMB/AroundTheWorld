'use client'

import React, { useState, useEffect } from 'react'
import { SignInWithBaseButton } from '@/app/components/SignInWithBase'
import { SpendPermissionSetup } from '@/app/components/SpendPermissionSetup'
import { getRewardDistributorAddressesClient } from '@/lib/utils/wallet-storage'
import { fetchPermissions } from '@base-org/account/spend-permission'
import { createBaseAccountSDK } from '@base-org/account'
import { ETH_ADDRESS, LEVEL_COST_ETH, DAILY_ALLOWANCE_ETH } from '../../lib/cdp/spend-permissions'

export default function SpendPermissionTest() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userAddress, setUserAddress] = useState<string>()
  const [hasSpendPermission, setHasSpendPermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [serverWallet, setServerWallet] = useState<any>(null)
  const [permissions, setPermissions] = useState<any[]>([])

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Load wallet addresses from storage file
      const addresses = await getRewardDistributorAddressesClient()
      setServerWallet(addresses)
      console.log('Loaded server wallet addresses from storage:', addresses)
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (address: string) => {
    console.log('User authenticated with address:', address)
    setIsAuthenticated(true)
    setUserAddress(address)
    
    // Load wallet addresses from storage file
    try {
      const addresses = await getRewardDistributorAddressesClient()
      setServerWallet(addresses)
      console.log('Loaded server wallet addresses from storage:', addresses)
    } catch (error) {
      console.error('Failed to load wallet addresses:', error)
    }
  }

  const handlePermissionGranted = async () => {
    setHasSpendPermission(true)
    await checkPermissions()
  }

  const checkPermissions = async () => {
    if (!userAddress || !serverWallet?.smartAccountAddress) return

    try {
      const sdk = createBaseAccountSDK({
        appName: "AroundTheWorld Game",
        appChainIds: [84532], // Base mainnet
      })
      
      const permissions = await fetchPermissions({
        account: userAddress as `0x${string}`,
        chainId: 84532,
        spender: serverWallet.smartAccountAddress as `0x${string}`,
        provider: sdk.getProvider(),
      })

      const ethPermissions = permissions.filter(p => 
        p.permission?.token?.toLowerCase() === ETH_ADDRESS.toLowerCase()
      )

      setPermissions(ethPermissions)
      setHasSpendPermission(ethPermissions.length > 0)
      console.log('Found ETH permissions:', ethPermissions)
    } catch (error) {
      console.error('Failed to check permissions:', error)
    }
  }

  const simulateLevelCharge = async () => {
    if (!userAddress || !serverWallet?.smartAccountAddress) {
      alert('Not authenticated or server wallet not ready')
      return
    }

    try {
      // This would normally be done server-side
      console.log(`Simulating charge of ${LEVEL_COST_ETH} ETH for level play`)
      console.log(`From user: ${userAddress}`)
      console.log(`To server: ${serverWallet.smartAccountAddress}`)
      
      alert(`Level charge simulation: ${LEVEL_COST_ETH} ETH (~$0.04)`)
    } catch (error) {
      console.error('Failed to simulate charge:', error)
      alert('Failed to simulate level charge')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Spend Permission Test</h1>
              <p className="text-gray-600">AroundTheWorld Game - Base Account Integration</p>
            </div>
            {isAuthenticated && userAddress && (
              <div className="text-sm text-gray-600">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Step 1: Authentication
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Sign in with your Base Account to create Smart Accounts for spend permissions.
              </p>
              <div className="mb-8 flex justify-center">
                <SignInWithBaseButton onSignIn={handleSignIn} colorScheme="light" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm max-w-2xl mx-auto">
              <h3 className="font-semibold text-gray-800 mb-4">How it works:</h3>
              <div className="text-left space-y-2 text-sm text-gray-600">
                <p>• Connect your wallet and sign SIWE message</p>
                <p>• Base Account SDK creates your Smart Account</p>
                <p>• Server creates its own Smart Account (spender)</p>
                <p>• Grant spend permissions between Smart Accounts</p>
                <p>• Play levels with automatic ETH charging</p>
              </div>
            </div>
          </div>
        ) : !hasSpendPermission ? (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Step 2: Spend Permissions
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Grant permission to charge {LEVEL_COST_ETH} ETH per level play.
              </p>
            </div>

            {serverWallet && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Server Wallet Ready</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>Server Address: {serverWallet.serverWalletAddress?.slice(0, 10)}...{serverWallet.serverWalletAddress?.slice(-8)}</p>
                  <p>Smart Account: {serverWallet.smartAccountAddress?.slice(0, 10)}...{serverWallet.smartAccountAddress?.slice(-8)}</p>
                </div>
              </div>
            )}

            <SpendPermissionSetup
              userAddress={userAddress!}
              onPermissionGranted={handlePermissionGranted}
            />
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                ✅ Spend Permissions Active
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Ready to play levels with automatic ETH charging!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Permission Status */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Permission Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Allowance:</span>
                    <span className="font-medium">{DAILY_ALLOWANCE_ETH} ETH (~$0.20)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Per Level Cost:</span>
                    <span className="font-medium">{LEVEL_COST_ETH} ETH (~$0.04)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Levels/Day:</span>
                    <span className="font-medium">{Math.floor(DAILY_ALLOWANCE_ETH / LEVEL_COST_ETH)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Permissions:</span>
                    <span className="font-medium text-green-600">{permissions.length}</span>
                  </div>
                </div>
              </div>

              {/* Test Actions */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Test Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={checkPermissions}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Refresh Permissions
                  </button>
                  <button
                    onClick={simulateLevelCharge}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Simulate Level Charge
                  </button>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Account Details</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Your EOA:</span>
                  <p className="font-mono text-xs break-all">{userAddress}</p>
                </div>
                <div>
                  <span className="text-gray-600">Server Smart Account:</span>
                  <p className="font-mono text-xs break-all">{serverWallet?.smartAccountAddress}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
