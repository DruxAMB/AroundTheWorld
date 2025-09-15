"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../utils/soundManager";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  redirectUrl?: string;
}

export function NotificationModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  redirectUrl 
}: NotificationModalProps) {
  
  const handleClose = () => {
    soundManager.play('click');
    onClose();
  };

  const handleRedirect = () => {
    if (redirectUrl) {
      soundManager.play('click');
      window.open(redirectUrl, '_blank');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="notification-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50"
        onClick={handleClose}
      />
      
      <motion.div
        key="notification-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-[var(--app-card-bg)] rounded-lg shadow-2xl max-w-md w-full border border-[var(--app-card-border)]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--app-card-border)] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔔</span>
              <h2 className="text-lg font-bold text-[var(--app-foreground)]">{title}</h2>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
            >
              <span className="text-xl">✖️</span>
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-[var(--app-foreground)] leading-relaxed mb-6">
              {message}
            </p>

            {/* Action Buttons */}
            <div>
              
              {redirectUrl && (
                <motion.button
                  onClick={handleRedirect}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 w-full py-2 px-4 bg-[var(--app-accent)] text-white rounded-lg font-medium transition-colors hover:bg-opacity-90"
                >
                  View More
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
