"use client";

import { useViewProfile } from "@coinbase/onchainkit/dist/minikit";
import { motion } from "framer-motion";
import { soundManager } from "../utils/soundManager";
import Image from "next/image";

interface FarcasterProfile {
  fid: number;
  name?: string;
  username?: string;
  avatar?: string;
}

interface FarcasterProfileCardProps {
  fid: number;
  name?: string;
  username?: string;
  avatar?: string;
  onClick?: () => void;
}

export function FarcasterProfileCard({ 
  fid, 
  name, 
  username, 
  avatar, 
  onClick 
}: FarcasterProfileCardProps) {
  const viewProfile = useViewProfile();
  
  const handleClick = () => {
    soundManager.play('click');
    if (onClick) {
      onClick();
    } else {
      viewProfile();
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center space-x-3 p-3 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center overflow-hidden">
        {avatar ? (
          <Image
            src={avatar} 
            alt={name || username || `User ${fid}`}
            className="w-full h-full object-cover"
            width={40}
            height={40}
          />
        ) : (
          <span className="text-white font-bold text-sm">
            {(name || username || 'U').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      
      {/* Profile Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[var(--app-foreground)] truncate">
          {name || username || `User ${fid}`}
        </h4>
        <p className="text-sm text-[var(--app-foreground-muted)]">
          FID: {fid}
        </p>
      </div>
      
      {/* View Profile Icon */}
      <div className="text-[var(--app-foreground-muted)]">
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M7 17L17 7M17 7H7M17 7V17"/>
        </svg>
      </div>
    </motion.div>
  );
}

interface FarcasterProfileListProps {
  profiles: FarcasterProfile[];
  onProfileSelect?: (profile: FarcasterProfile) => void;
}

export function FarcasterProfileList({ profiles, onProfileSelect }: FarcasterProfileListProps) {
  return (
    <div className="space-y-2">
      {profiles.map((profile) => (
        <FarcasterProfileCard
          key={profile.fid}
          fid={profile.fid}
          name={profile.name}
          username={profile.username}
          avatar={profile.avatar}
          onClick={() => onProfileSelect?.(profile)}
        />
      ))}
    </div>
  );
}