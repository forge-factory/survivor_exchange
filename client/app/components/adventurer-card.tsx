"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { FormattedNFT } from "../lib/types";

type AdventurerCardProps = {
  nft: FormattedNFT;
  selected: boolean;
  onToggle: () => void;
  onInfoClick?: () => void;
};

// Client-side cache for fetched images
const imageCache = new Map<string, string>();

export default function AdventurerCard({
  nft,
  selected,
  onToggle,
  onInfoClick,
}: AdventurerCardProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const getAttribute = (traitType: string) => {
    const attr = nft.attributes.find((a) => a.trait_type === traitType);
    return attr ? String(attr.value) : undefined;
  };

  const playerName = getAttribute("Player Name") || nft.metadataName || "Unknown";
  const xp = getAttribute("XP") || getAttribute("Score") || "0";
  const level = getAttribute("Level") || Math.floor(Math.sqrt(parseInt(xp))).toString();
  const gameName = getAttribute("Game Name") || "Death Mountain";
  const gameOver = getAttribute("Game Over") === "True";

  // Parse token ID - handle both hex and decimal formats
  const tokenIdNum = nft.tokenId.startsWith("0x")
    ? parseInt(nft.tokenId, 16)
    : parseInt(nft.tokenId, 10);
  const tokenIdDisplay = `#${tokenIdNum}`;

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px", threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch image from API only when visible
  useEffect(() => {
    if (!isVisible) return;

    const fetchImage = async () => {
      // Check client-side cache first
      const cached = imageCache.get(nft.tokenId);
      if (cached) {
        setImageSrc(cached);
        return;
      }

      setImageLoading(true);
      try {
        const response = await fetch(`/api/adventurer-image/${tokenIdNum}`);
        if (response.ok) {
          const data = await response.json();
          const image = data.metadata?.image;
          if (image) {
            imageCache.set(nft.tokenId, image);
            setImageSrc(image);
          }
        }
      } catch (error) {
        console.error("Failed to fetch adventurer image:", error);
      } finally {
        setImageLoading(false);
      }
    };

    fetchImage();
  }, [isVisible, nft.tokenId, tokenIdNum]);

  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`group relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border bg-black/70 backdrop-blur-sm p-3 transition-all duration-200 hover:-translate-y-0.5 hover:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(50,255,52)]/70 ${
        selected
          ? "border-[rgb(50,255,52)] shadow-[0_0_20px_rgba(50,255,52,0.3)]"
          : "border-[rgb(50,255,52)]/15 hover:border-[rgb(50,255,52)]/40 hover:bg-black/80"
      }`}
    >
      {/* Selected checkmark */}
      {selected && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute top-2 right-2 z-20 w-5 h-5 text-[rgb(50,255,52)]"
        >
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )}
      {/* Unselected hover checkbox */}
      {!selected && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute top-2 right-2 z-20 w-5 h-5 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" />
        </svg>
      )}

      {/* Header: Token ID + Dead badge + Game Name */}
      <header className="flex items-center justify-between text-[9px] uppercase tracking-wider text-[rgb(186,255,188)]/60">
        <div className="flex items-center gap-2">
          <span>{tokenIdDisplay}</span>
          {gameOver && (
            <span className="rounded-full bg-red-500/20 border border-red-500/50 px-1.5 py-0.5 text-[7px] font-orbitron uppercase text-red-400">
              Dead
            </span>
          )}
        </div>
        <span className="truncate max-w-[50%] text-right">{gameName}</span>
      </header>

      {/* Main content: Image + Name + XP */}
      <div className="flex flex-col items-center gap-2 text-white flex-1">
        {/* Image container */}
        <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center bg-[rgb(50,255,52)]/5 rounded-lg overflow-hidden">
          {imageLoading ? (
            <div className="animate-pulse w-12 h-12 rounded-full bg-[rgb(50,255,52)]/10" />
          ) : imageSrc ? (
            <Image
              src={imageSrc}
              alt={playerName}
              width={96}
              height={96}
              draggable={false}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-[rgb(50,255,52)]/40"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="m22 8-4 4" />
              <path d="m18 8 4 4" />
            </svg>
          )}
          {/* Info button */}
          {onInfoClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick();
              }}
              className="absolute bottom-0 right-0 z-20 w-5 h-5 rounded-full bg-black/70 border border-white/30 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 hover:border-white/50 transition-all"
              title="View details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
          )}
        </div>

        {/* Name */}
        <h3 className="text-sm font-orbitron uppercase tracking-wide leading-tight text-center">
          {playerName}
        </h3>

        {/* Level & XP Display */}
        <div className="flex items-center justify-center gap-4 mt-auto">
          <div className="flex flex-col items-center">
            <span className="text-xl font-orbitron font-bold text-white">
              {level}
            </span>
            <span className="text-[9px] uppercase text-[rgb(186,255,188)]/50">LVL</span>
          </div>
          <div className="w-px h-8 bg-[rgb(50,255,52)]/20" />
          <div className="flex flex-col items-center">
            <span className="text-xl font-orbitron font-bold text-[rgb(50,255,52)]">
              {parseInt(xp).toLocaleString()}
            </span>
            <span className="text-[9px] uppercase text-[rgb(186,255,188)]/50">XP</span>
          </div>
        </div>
      </div>
    </article>
  );
}
