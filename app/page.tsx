"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
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
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { GameWrapper } from "./components/GameWrapper";
import { SettingsModal } from "./components/SettingsModal";
import { Leaderboard } from "./components/Leaderboard";
import { NameInputModal } from "./components/NameInputModal";
import { soundManager } from "./utils/soundManager";
import { useGameData } from "./hooks/useGameData";

export default function App() {
  const { context, isFrameReady, setFrameReady } = useMiniKit();
  const { address, isConnected, isConnecting } = useAccount();
  const { 
    player, 
    progress, 
    settings, 
    loading, 
    saving, 
    updatePlayerName, 
    saveProgress, 
    saveSettings,
    migrateFromLocalStorage 
  } = useGameData();
  
  const [frameAdded, setFrameAdded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

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

  const handleNameSubmit = async (name: string) => {
    try {
      await updatePlayerName(name);
      setShowNameInput(false);
      soundManager.play('win'); // Celebration sound for completing setup
    } catch (error) {
      console.error('Failed to save player name:', error);
    }
  };

  const handleTestNameInput = () => {
    // Manual trigger for testing
    setShowNameInput(true);
  };

  // Check if user needs to input name after wallet connection
  useEffect(() => {
    // Debug logging to understand the wallet connection state
    console.log('Wallet Connected:', isConnected);
    console.log('Wallet Address:', address);
    console.log('Player Data:', player);
    console.log('Show Name Input:', showNameInput);
    
    // Use wagmi's isConnected to detect wallet connection and check if player has name
    if (isConnected && player && !player.name && !showNameInput) {
      console.log('Wallet connected but no name set - triggering name input modal');
      // User has connected wallet but has no name - show name input modal
      setShowNameInput(true);
    }
  }, [isConnected, address, player, showNameInput]);

  // Auto-migrate localStorage data when player first connects
  useEffect(() => {
    if (isConnected && player && typeof window !== 'undefined') {
      // Check if we have localStorage data that needs migration
      const hasLocalData = localStorage.getItem('match3-player-name') || 
                          localStorage.getItem('match3-progress') || 
                          localStorage.getItem('match3-settings');
      
      if (hasLocalData && !player.name) {
        console.log('Migrating localStorage data to Redis...');
        migrateFromLocalStorage();
      }
    }
  }, [isConnected, player, migrateFromLocalStorage]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Test Name Input Button - Remove this after debugging */}
            <motion.button
              onClick={handleTestNameInput}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors shadow-sm"
              title="Test Name Input"
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
            {saveFrameButton}
          </div>
        </header>

        <main className="flex-1">
          {showLeaderboard ? (
            <Leaderboard 
              onClose={handleCloseLeaderboard}
              currentPlayerScore={player?.totalScore || 0}
              currentPlayerName={player?.name || "You"}
            />
          ) : (
            <GameWrapper />
          )}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
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
      
      {/* Name Input Modal */}
      <NameInputModal
        isOpen={showNameInput}
        onNameSubmit={handleNameSubmit}
        walletAddress={address}
      />
    </div>
  );
}
