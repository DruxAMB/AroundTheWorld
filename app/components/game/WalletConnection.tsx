"use client";

import React from 'react';
import {
  ConnectWallet,
  ConnectWalletText,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Name,
  Identity,
  EthBalance,
  Address,
  Avatar,
} from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";

interface WalletConnectionProps {
  onConnect: (address: string) => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ onConnect }) => {
  const { address, isConnected } = useAccount();

  // Effect to call onConnect when wallet is connected
  React.useEffect(() => {
    if (isConnected && address) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  return (
    <div className="wallet-connection p-4 bg-white rounded-lg shadow-md mb-4">
      <h2 className="text-xl font-bold mb-4">Wallet Connection</h2>
      
      {isConnected && address ? (
        <div className="connected-wallet">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Identity address={address} className="!bg-inherit p-0 [&>div]:space-x-2">
                <Avatar className="w-10 h-10 rounded-full" />
                <div>
                  <Name className="font-bold" />
                  <Address className="text-sm text-gray-500" />
                </div>
              </Identity>
            </div>
            <div>
              <EthBalance address={address} className="text-lg font-medium" />
            </div>
          </div>
          
          <div className="wallet-controls flex justify-end">
            <Wallet>
              <WalletDropdown>
                <WalletDropdownDisconnect className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-md text-sm" />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      ) : (
        <div className="connect-wallet">
          <p className="mb-4 text-gray-600">
            Connect your wallet to save your progress, compete on the leaderboard, and earn rewards.
          </p>
          <div className="flex justify-center">
            <ConnectWallet>
              <ConnectWalletText className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">
                Connect Wallet
              </ConnectWalletText>
            </ConnectWallet>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Powered by Base + Coinbase Smart Wallet
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;
