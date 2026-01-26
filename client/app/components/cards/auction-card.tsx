"use client";

import Image from "next/image";
import { useMemo } from "react";
import { IMAGE_BASE_URL } from "../../lib/constants";
import type { FormattedNFT } from "../../lib/types";

type AuctionCardProps = {
  auction: {
    auction_id: string;
    current_bid?: string;
    end_time?: string;
    status?: string;
    fee_token?: string;
    bids?: { amount: string }[];
  };
  items?: FormattedNFT[];
  onClick?: () => void;
};

export default function AuctionCard({ auction, items, onClick }: AuctionCardProps) {
  // Get the first item's image for the card
  const primaryItem = items?.[0];
  const itemCount = items?.length || 0;

  const imageSrc = useMemo(() => {
    if (primaryItem?.metadata?.image) return primaryItem.metadata.image;
    if (primaryItem?.imagePath) return `${IMAGE_BASE_URL}/${primaryItem.imagePath}`;
    return "/logo.png";
  }, [primaryItem]);

  // Format current bid
  const formattedBid = useMemo(() => {
    const bidStr = auction.current_bid || "0";
    const bid = bidStr.startsWith("0x") || bidStr.startsWith("0X")
      ? parseInt(bidStr, 16)
      : parseFloat(bidStr);

    if (bid === 0) return "No bids";

    // Assume USDC (6 decimals) for now - could be enhanced with token detection
    const amount = bid / 1e6;
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [auction.current_bid]);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!auction.end_time) return null;

    const endTime = parseInt(auction.end_time) * 1000;
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [auction.end_time]);

  const isEndingSoon = useMemo(() => {
    if (!auction.end_time) return false;
    const endTime = parseInt(auction.end_time) * 1000;
    const diff = endTime - Date.now();
    return diff > 0 && diff < 60 * 60 * 1000; // Less than 1 hour
  }, [auction.end_time]);

  // Get tier from primary item
  const tier = primaryItem?.tier || "5";
  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    "1": { bg: "rgba(251, 191, 36, 0.15)", text: "#FCD34D", border: "rgba(251, 191, 36, 0.4)" },
    "2": { bg: "rgba(168, 85, 247, 0.15)", text: "#C084FC", border: "rgba(168, 85, 247, 0.4)" },
    "3": { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.4)" },
    "4": { bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.4)" },
    "5": { bg: "rgba(156, 163, 175, 0.15)", text: "#9CA3AF", border: "rgba(156, 163, 175, 0.4)" },
  };
  const tierStyle = tierColors[tier] || tierColors["5"];

  return (
    <article
      onClick={onClick}
      className="flex-shrink-0 w-[200px] md:w-[240px] group cursor-pointer animate-card-lift"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Image Container */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-xl mb-3 transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Image
          src={imageSrc}
          alt={primaryItem?.metadataName || "Auction"}
          fill
          draggable={false}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200">
          {/* Time Badge */}
          {timeRemaining && (
            <div className="absolute top-3 left-3">
              <span
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                  isEndingSoon ? "animate-urgency-pulse" : ""
                }`}
                style={{
                  backgroundColor: isEndingSoon
                    ? "rgba(245, 158, 11, 0.95)"
                    : "rgba(0,0,0,0.75)",
                  color: isEndingSoon ? "#000" : "var(--color-text)",
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {timeRemaining}
              </span>
            </div>
          )}

          {/* Tier Badge */}
          {(tier === "1" || tier === "2") && (
            <div className="absolute top-3 right-3">
              <span
                className="px-2 py-1 rounded text-xs font-bold"
                style={{
                  backgroundColor: tierStyle.bg,
                  color: tierStyle.text,
                  border: `1px solid ${tierStyle.border}`,
                }}
              >
                T{tier}
              </span>
            </div>
          )}

          {/* Item Count Badge (if bundle) */}
          {itemCount > 1 && (
            <div className="absolute bottom-3 right-3">
              <span
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: "rgba(0,0,0,0.75)",
                  color: "var(--color-champagne)",
                }}
              >
                {itemCount} items
              </span>
            </div>
          )}

          {/* Quick Bid Button */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {itemCount <= 1 && (
              <button className="w-full py-2 rounded-lg text-sm font-semibold btn-gold">
                Place Bid
              </button>
            )}
          </div>
        </div>

        {/* Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 card-gradient pointer-events-none" />
      </div>

      {/* Card Info */}
      <div>
        <h3
          className="font-display text-sm md:text-base leading-tight truncate"
          style={{ color: "var(--color-text)" }}
        >
          {primaryItem?.metadataName || `Auction #${auction.auction_id}`}
        </h3>
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: "var(--color-text-muted)" }}
        >
          {primaryItem?.beastName || "Unknown Beast"}
        </p>

        {/* Price Row */}
        <div className="flex items-center justify-between mt-2">
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: "var(--color-champagne)" }}
          >
            {formattedBid}
          </span>
          {auction.bids && auction.bids.length > 0 && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {auction.bids.length} bid{auction.bids.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Ending Soon Glow */}
      {isEndingSoon && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
          }}
        />
      )}
    </article>
  );
}
