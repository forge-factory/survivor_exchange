"use client";

import { useMemo } from "react";
import Image from "next/image";
import { IMAGE_BASE_URL } from "../../lib/constants";
import type { AuctionWithNFTs } from "../../hooks";

interface ActivityItem {
  id: string;
  type: "bid" | "sale" | "listing";
  auctionId: string;
  auctionName?: string;
  amount: number;
  tokenSymbol: string;
  actor?: string;
  timestamp: number;
  image?: string;
}

interface ActivityFeedProps {
  auctions?: AuctionWithNFTs[];
  className?: string;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ActivityFeed({ auctions, className = "" }: ActivityFeedProps) {
  // Generate activity items from auctions
  const activities = useMemo<ActivityItem[]>(() => {
    if (!auctions) return [];

    const items: ActivityItem[] = [];

    for (const auction of auctions) {
      const primaryNft = auction.nfts?.[0];
      const image = primaryNft?.metadata?.image ||
        (primaryNft?.imagePath ? `${IMAGE_BASE_URL}/${primaryNft.imagePath}` : undefined);

      // Add bids as activity
      if (auction.bids) {
        for (const bid of auction.bids) {
          const amount = bid.amount.startsWith("0x")
            ? parseInt(bid.amount, 16) / 1e6
            : parseFloat(bid.amount) / 1e6;

          items.push({
            id: `bid-${auction.auction_id}-${bid.bidder}-${bid.amount}`,
            type: "bid",
            auctionId: auction.auction_id,
            auctionName: primaryNft?.metadataName || auction.name || `Auction #${auction.auction_id}`,
            amount,
            tokenSymbol: "USDC",
            actor: bid.bidder,
            timestamp: Date.now() - Math.random() * 3600000, // Placeholder - would come from actual timestamp
            image,
          });
        }
      }

      // Add settled auctions as sales
      if (parseInt(auction.status || "0") === 4 && auction.executedAt) {
        const currentBid = auction.current_bid?.startsWith("0x")
          ? parseInt(auction.current_bid, 16) / 1e6
          : parseFloat(auction.current_bid || "0") / 1e6;

        items.push({
          id: `sale-${auction.auction_id}`,
          type: "sale",
          auctionId: auction.auction_id,
          auctionName: primaryNft?.metadataName || auction.name || `Auction #${auction.auction_id}`,
          amount: currentBid,
          tokenSymbol: "USDC",
          timestamp: parseInt(auction.executedAt) * 1000,
          image,
        });
      }
    }

    // Sort by timestamp descending and limit
    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [auctions]);

  if (activities.length === 0) {
    return (
      <div
        className={`rounded-xl p-4 ${className}`}
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h3
          className="font-display text-sm mb-3 flex items-center gap-2"
          style={{ color: "var(--color-text)" }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--color-gold)" }}
          />
          Live Activity
        </h3>
        <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <aside
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h3
          className="font-display text-sm flex items-center gap-2"
          style={{ color: "var(--color-text)" }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--color-gold)" }}
          />
          Live Activity
        </h3>
      </div>

      {/* Activity List */}
      <div className="max-h-[400px] overflow-y-auto">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5 ${
              index !== activities.length - 1 ? "border-b" : ""
            }`}
            style={{ borderColor: "var(--color-border)" }}
          >
            {/* Image */}
            <div
              className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
              style={{ backgroundColor: "var(--color-elevated)" }}
            >
              {activity.image ? (
                <Image
                  src={activity.image}
                  alt={activity.auctionName || ""}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    style={{ color: "var(--color-text-muted)" }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: "var(--color-text)" }}>
                {activity.type === "sale" ? (
                  <>
                    <span style={{ color: "var(--color-success)" }}>Sold</span>
                    {" "}
                    {activity.auctionName}
                  </>
                ) : activity.type === "bid" ? (
                  <>
                    <span style={{ color: "var(--color-gold)" }}>New bid</span>
                    {" on "}
                    {activity.auctionName}
                  </>
                ) : (
                  <>
                    <span style={{ color: "var(--color-champagne)" }}>Listed</span>
                    {" "}
                    {activity.auctionName}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: "var(--color-champagne)" }}
                >
                  ${activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {activity.actor && (
                  <>
                    <span style={{ color: "var(--color-text-dim)" }}>·</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {truncateAddress(activity.actor)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Time */}
            <span
              className="text-[10px] flex-shrink-0"
              style={{ color: "var(--color-text-dim)" }}
            >
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
