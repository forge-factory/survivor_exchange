"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { FormattedNFT } from "../lib/types";

interface AdventurerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nfts: FormattedNFT[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onSelect?: (tokenId: string) => void;
  isSelected?: boolean;
}

// Client-side cache for fetched metadata
const metadataCache = new Map<string, { image: string; name: string; description: string }>();

export default function AdventurerDetailModal({
  isOpen,
  onClose,
  nfts,
  currentIndex,
  onNavigate,
  onSelect,
  isSelected,
}: AdventurerDetailModalProps) {
  const currentNft = nfts[currentIndex];
  const [metadata, setMetadata] = useState<{ image: string; name: string; description: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const getAttribute = (traitType: string) => {
    const attr = currentNft?.attributes.find((a) => a.trait_type === traitType);
    return attr ? String(attr.value) : undefined;
  };

  const playerName = getAttribute("Player Name") || currentNft?.metadataName || "Unknown";
  const xp = getAttribute("XP") || getAttribute("Score") || "0";
  const level = getAttribute("Level") || Math.floor(Math.sqrt(parseInt(xp))).toString();
  const gameName = getAttribute("Game Name") || "Death Mountain";
  const gameOver = getAttribute("Game Over") === "True";

  // Parse token ID
  const tokenIdNum = currentNft?.tokenId.startsWith("0x")
    ? parseInt(currentNft.tokenId, 16)
    : parseInt(currentNft?.tokenId || "0", 10);

  // Fetch metadata when modal opens or NFT changes
  useEffect(() => {
    if (!isOpen || !currentNft) {
      setMetadata(null);
      return;
    }

    const cached = metadataCache.get(currentNft.tokenId);
    if (cached) {
      setMetadata(cached);
      return;
    }

    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/adventurer-image/${tokenIdNum}`);
        if (response.ok) {
          const data = await response.json();
          if (data.metadata) {
            const meta = {
              image: data.metadata.image || "",
              name: data.metadata.name || `Adventurer #${tokenIdNum}`,
              description: data.metadata.description || "",
            };
            metadataCache.set(currentNft.tokenId, meta);
            setMetadata(meta);
          }
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [isOpen, currentNft, tokenIdNum]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < nfts.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, nfts.length, onClose, onNavigate]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < nfts.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, nfts.length, onNavigate]);

  if (!isOpen || !currentNft) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-black/95 border-2 border-[rgb(50,255,52)]/60 rounded-2xl shadow-[0_0_40px_rgba(50,255,52,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(50,255,52)]/30">
          <h2 className="text-lg font-orbitron uppercase tracking-wider text-white">
            {playerName}
          </h2>
          <div className="flex items-center gap-3">
            {/* Navigation */}
            {nfts.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-[rgb(50,255,52)]/60 bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="text-xs text-white font-orbitron bg-[rgb(50,255,52)]/10 px-2 py-1 rounded-full border border-[rgb(50,255,52)]/30">
                  {currentIndex + 1} / {nfts.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === nfts.length - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-[rgb(50,255,52)]/60 bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgb(50,255,52)]/40 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/20 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-4">
          {/* Image - Large and centered */}
          <div className="relative w-64 h-64 rounded-xl border-2 border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/5 overflow-hidden flex items-center justify-center">
            {loading ? (
              <div className="animate-pulse w-24 h-24 rounded-full bg-[rgb(50,255,52)]/10" />
            ) : metadata?.image ? (
              <Image
                src={metadata.image}
                alt={playerName}
                width={256}
                height={256}
                className="w-full h-full object-contain"
                unoptimized
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="w-24 h-24 text-[rgb(50,255,52)]/30"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="m22 8-4 4" />
                <path d="m18 8 4 4" />
              </svg>
            )}
          </div>

          {/* Token Info */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[rgb(186,255,188)]/60 font-orbitron">#{tokenIdNum}</span>
            <span className="text-[rgb(186,255,188)]/40">|</span>
            <span className="text-[rgb(186,255,188)]/60">{gameName}</span>
            {gameOver && (
              <>
                <span className="text-[rgb(186,255,188)]/40">|</span>
                <span className="rounded-full bg-red-500/20 border border-red-500/50 px-2 py-0.5 text-xs font-orbitron uppercase text-red-400">
                  Dead
                </span>
              </>
            )}
          </div>

          {/* Level & XP */}
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-orbitron font-bold text-white">
                {level}
              </span>
              <span className="text-sm uppercase tracking-wider text-[rgb(186,255,188)]/50">
                Level
              </span>
            </div>
            <div className="w-px h-16 bg-[rgb(50,255,52)]/30" />
            <div className="flex flex-col items-center">
              <span className="text-4xl font-orbitron font-bold text-[rgb(50,255,52)]">
                {parseInt(xp).toLocaleString()}
              </span>
              <span className="text-sm uppercase tracking-wider text-[rgb(186,255,188)]/50">
                XP
              </span>
            </div>
          </div>

          {/* Select Button */}
          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(currentNft.tokenId)}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-orbitron uppercase tracking-[0.14em] transition ${
                isSelected
                  ? "border-2 border-[rgb(50,255,52)] bg-[rgb(50,255,52)]/20 text-[rgb(50,255,52)]"
                  : "border border-[rgb(50,255,52)]/60 bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/20"
              }`}
            >
              {isSelected ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Selected
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  Select for Auction
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
