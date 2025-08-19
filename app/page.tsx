"use client";

import {
  useMiniKit,
  useOpenUrl
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useAccount } from 'wagmi';
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./components/DemoComponents";
import { GameWrapper } from "./components/GameWrapper";
import { SettingsModal } from "./components/SettingsModal";
import { Leaderboard } from "./components/Leaderboard";
import { UserProfile } from "./components/UserProfile";

import { InfoModal } from "./components/InfoModal";
import { soundManager } from "./utils/soundManager";
import { useGameData } from "./hooks/useGameData";

export default function App() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const { address, isConnected } = useAccount();
  const { player, updatePlayerName } = useGameData();
  
  // const [frameAdded, setFrameAdded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gameState, setGameState] = useState<'level-select' | 'playing' | 'level-complete' | 'error'>('level-select');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // const handleAddFrame = useCallback(async () => {
  //   const frameAdded = await addFrame();
  //   setFrameAdded(Boolean(frameAdded));
  // }, [addFrame]);

  const handleOpenSettings = () => {
    soundManager.play('click');
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleOpenLeaderboard = () => {
    soundManager.play('click');
    setShowLeaderboard(true);
  };

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
  };

  const handleOpenUserProfile = () => {
    soundManager.play('click');
    setShowUserProfile(true);
  };

  const handleOpenInfo = () => {
    soundManager.play('click');
    setShowInfo(true);
  };

  const handleCloseUserProfile = () => {
    setShowUserProfile(false);
  };

  const { context } = useMiniKit();

  // Access user information
  const userFid = context?.user?.fid;           // Farcaster ID (always available)
  const username = context?.user?.username;     // Username (when available)
  const displayName = context?.user?.displayName; // Display name (when available)
  const pfpUrl = context?.user?.pfpUrl;         // Profile picture URL (when available)
  
  // Automatically set up player when wallet connects (no name needed - use Farcaster data for display)
  useEffect(() => {
    if (isConnected && player && !player.name && address) {
      const setupPlayer = async () => {
        try {
          // Just create a basic player record - Farcaster data will be used for display
          const playerName = `Player${address.slice(-4)}`;
          await updatePlayerName(playerName);
          
          console.log('Player profile created, using Farcaster data for display:', { userFid, username, displayName, pfpUrl });
        } catch (error) {
          console.error('Failed to set up player profile:', error);
        }
      };
      
      setupPlayer();
    }
  }, [isConnected, address, player, updatePlayerName, displayName, pfpUrl, userFid, username]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      {/* Fixed Header - Hidden during gameplay */}
      {gameState !== 'playing' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-[var(--app-card-border)] backdrop-blur-sm">
        <div className="w-full max-w-md mx-auto px-5 py-3">
          <div className="flex justify-between items-center h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet className="text-inherit !w-20 !min-w-0 bg-transparent hover:bg-transparent hover:text-blue-600" disconnectedLabel='Log In'>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect text="Log Out" />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* User Profile Button */}
            <motion.button
              onClick={handleOpenUserProfile}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors shadow-sm"
              title="User Profile"
            >
              <span className="text-lg">👤</span>
            </motion.button>
            {/* Leaderboard Button */}
            <motion.button
              onClick={handleOpenLeaderboard}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors shadow-sm"
              title="Leaderboard"
            >
              <span className="text-lg">🏆</span>
            </motion.button>
            {/* Info Button */}
            <motion.button
              onClick={handleOpenInfo}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors shadow-sm"
              title="How to Play"
            >
              <span className="text-lg">ℹ️</span>
            </motion.button>
            {/* Settings Button */}
            <motion.button
              onClick={handleOpenSettings}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors shadow-sm"
              title="Settings"
            >
              <span className="text-lg">⚙️</span>
            </motion.button>
          </div>
          </div>
        </div>
        </header>
      )}

      {/* Main Content with Top Padding for Fixed Header */}
      <div className="w-full max-w-md mx-auto">
        <main className="flex-1">
          <GameWrapper onGameStateChange={setGameState} />
        </main>

        <footer className="mt-2 pt-4 justify-center hidden">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            Built on Base with MiniKit
          </Button>
        </footer>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
      />
      
      {/* Info Modal */}
      <InfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
      />
      

      
      {/* User Profile Modal */}
      <UserProfile
        isOpen={showUserProfile}
        onClose={handleCloseUserProfile}
      />
      
      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <Leaderboard
          onClose={handleCloseLeaderboard}
          currentPlayerScore={player?.totalScore}
          currentPlayerName={player?.name}
        />
      )}
    </div>
  );
}
