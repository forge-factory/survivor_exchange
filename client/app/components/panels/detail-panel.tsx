"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { IMAGE_BASE_URL } from "../../lib/constants";
import { CountdownTimer } from "../ui";

type DetailPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  auction: {
    auction_id: string;
    current_bid?: string;
    starting_price?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    seller?: string;
  } | null;
  items?: Array<{
    tokenId: string;
    metadataName?: string;
    beastName?: string;
    imagePath?: string;
    tier?: string;
    power?: string;
    level?: string;
    beastType?: string;
    metadata?: { image?: string };
  }>;
  onPlaceBid?: (amount: string) => void;
  isConnected?: boolean;
  onConnect?: () => void;
};

type TabType = "details" | "bids" | "provenance";

export default function DetailPanel({
  isOpen,
  onClose,
  auction,
  items,
  onPlaceBid,
  isConnected,
  onConnect,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [bidAmount, setBidAmount] = useState("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Reset state when auction changes
  useEffect(() => {
    setBidAmount("");
    setCurrentItemIndex(0);
    setActiveTab("details");
  }, [auction?.auction_id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
      // Arrow key navigation for items
      if (items && items.length > 1) {
        if (e.key === "ArrowLeft") {
          setCurrentItemIndex((prev) => Math.max(0, prev - 1));
        } else if (e.key === "ArrowRight") {
          setCurrentItemIndex((prev) => Math.min(items.length - 1, prev + 1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, items]);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const minSwipeDistance = 50;

    // Only trigger if horizontal movement > vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && items && items.length > 1) {
        // Swipe right -> previous item
        setCurrentItemIndex((prev) => Math.max(0, prev - 1));
      } else if (deltaX < 0 && items && items.length > 1) {
        // Swipe left -> next item
        setCurrentItemIndex((prev) => Math.min(items.length - 1, prev + 1));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [items]);

  const currentItem = items?.[currentItemIndex];

  // Format current bid
  const formattedBid = useCallback(() => {
    const bidStr = auction?.current_bid || "0";
    const bid = bidStr.startsWith("0x") || bidStr.startsWith("0X")
      ? parseInt(bidStr, 16)
      : parseFloat(bidStr);

    if (bid === 0) return { display: "No bids", value: 0 };

    const amount = bid / 1e6; // Assume USDC
    return {
      display: `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      value: amount,
    };
  }, [auction?.current_bid]);

  const formatStartingPrice = useCallback(() => {
    const priceStr = auction?.starting_price || "0";
    const price = priceStr.startsWith("0x") || priceStr.startsWith("0X")
      ? parseInt(priceStr, 16)
      : parseFloat(priceStr);

    const amount = price / 1e6;
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [auction?.starting_price]);

  const handleQuickBid = (multiplier: number) => {
    const currentBidValue = formattedBid().value;
    const basePrice = currentBidValue > 0 ? currentBidValue : parseFloat(auction?.starting_price || "0") / 1e6;
    const newBid = (basePrice * multiplier).toFixed(2);
    setBidAmount(newBid);
  };

  if (!isOpen || !auction) return null;

  const imageSrc = currentItem?.metadata?.image
    ? currentItem.metadata.image
    : currentItem?.imagePath
      ? `${IMAGE_BASE_URL}/${currentItem.imagePath}`
      : "/logo.png";

  const tier = currentItem?.tier || "5";
  const tierColors: Record<string, string> = {
    "1": "#FCD34D",
    "2": "#C084FC",
    "3": "#60A5FA",
    "4": "#4ADE80",
    "5": "#9CA3AF",
  };

  return (
    <>
      {/* Backdrop - only on mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className="fixed right-0 top-16 bottom-0 w-full md:w-[400px] lg:w-[440px] z-50 flex flex-col animate-slide-in-right"
        style={{
          backgroundColor: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="font-display text-lg" style={{ color: "var(--color-text)" }}>
            {currentItem?.metadataName || `Auction #${auction.auction_id}`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          >
            <svg
              className="w-5 h-5"
              style={{ color: "var(--color-text-muted)" }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          <div className="relative aspect-square w-full">
            <Image
              src={imageSrc}
              alt={currentItem?.metadataName || "Auction item"}
              fill
              className="object-cover"
              unoptimized
            />

            {/* Tier Badge */}
            <div className="absolute top-3 left-3">
              <span
                className="px-2 py-1 rounded text-xs font-bold"
                style={{
                  backgroundColor: `${tierColors[tier]}20`,
                  color: tierColors[tier],
                  border: `1px solid ${tierColors[tier]}40`,
                }}
              >
                T{tier}
              </span>
            </div>

            {/* Item count if bundle */}
            {items && items.length > 1 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                  disabled={currentItemIndex === 0}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                >
                  <svg className="w-4 h-4" style={{ color: "var(--color-text)" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span
                  className="px-3 py-1 rounded-lg text-sm"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "var(--color-text)" }}
                >
                  {currentItemIndex + 1} / {items.length}
                </span>
                <button
                  onClick={() => setCurrentItemIndex(Math.min(items.length - 1, currentItemIndex + 1))}
                  disabled={currentItemIndex === items.length - 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                >
                  <svg className="w-4 h-4" style={{ color: "var(--color-text)" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Price Block */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Current Bid */}
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "var(--color-elevated)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Current Bid
                </p>
                <p className="font-display text-lg" style={{ color: "var(--color-champagne)" }}>
                  {formattedBid().display}
                </p>
              </div>

              {/* Reserve */}
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "var(--color-elevated)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Reserve
                </p>
                <p className="font-mono text-sm" style={{ color: "var(--color-text)" }}>
                  {formatStartingPrice()}
                </p>
              </div>

              {/* Time Left */}
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--color-urgency)" }}>
                  Ends In
                </p>
                <p className="font-mono text-sm" style={{ color: "var(--color-urgency)" }}>
                  <CountdownTimer
                    endTime={auction.end_time || "0"}
                    status={auction.status || "2"}
                  />
                </p>
              </div>
            </div>

            {/* Bid Input */}
            <div className="space-y-3">
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount"
                  className="w-full h-12 pl-7 pr-4 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--color-gold)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--color-border)";
                  }}
                />
              </div>

              {/* Quick Bid Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleQuickBid(1.05)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium btn-ghost"
                >
                  +5%
                </button>
                <button
                  onClick={() => handleQuickBid(1.1)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium btn-ghost"
                >
                  +10%
                </button>
                <button
                  onClick={() => handleQuickBid(1.5)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium btn-ghost"
                >
                  1.5x
                </button>
                <button
                  onClick={() => handleQuickBid(2)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium btn-ghost"
                >
                  2x
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="flex border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              {(["details", "bids", "provenance"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab ? "" : "opacity-50 hover:opacity-75"
                  }`}
                  style={{
                    color: activeTab === tab ? "var(--color-gold)" : "var(--color-text-muted)",
                    borderBottom: activeTab === tab ? "2px solid var(--color-gold)" : "2px solid transparent",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {activeTab === "details" && currentItem && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--color-elevated)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Type</p>
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {currentItem.beastType || "Unknown"}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--color-elevated)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Level</p>
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {currentItem.level || "0"}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--color-elevated)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Power</p>
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {currentItem.power || "0"}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--color-elevated)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Tier</p>
                      <p className="text-sm font-medium" style={{ color: tierColors[tier] }}>
                        Tier {tier}
                      </p>
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: "var(--color-elevated)" }}
                  >
                    <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Beast Name</p>
                    <p className="text-sm" style={{ color: "var(--color-text)" }}>
                      {currentItem.beastName || "Unknown Beast"}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "bids" && (
                <div className="space-y-2">
                  <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                    Bid history coming soon
                  </p>
                </div>
              )}

              {activeTab === "provenance" && (
                <div className="space-y-2">
                  <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                    Ownership history coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Bid Bar with Safe Area Support */}
        <div
          className="p-4 border-t"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {/* Mobile: Compact bid input + button row */}
          <div className="flex gap-3 md:hidden">
            <div className="relative flex-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                $
              </span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Amount"
                className="w-full h-12 pl-7 pr-3 rounded-xl text-sm focus:outline-none"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
            {isConnected ? (
              <button
                onClick={() => onPlaceBid?.(bidAmount)}
                disabled={!bidAmount || parseFloat(bidAmount) <= 0}
                className="px-6 h-12 rounded-xl text-sm font-semibold btn-gold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Place Bid
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="px-6 h-12 rounded-xl text-sm font-semibold btn-gold whitespace-nowrap"
              >
                Connect
              </button>
            )}
          </div>

          {/* Desktop: Full width button */}
          <div className="hidden md:block">
            {isConnected ? (
              <button
                onClick={() => onPlaceBid?.(bidAmount)}
                disabled={!bidAmount || parseFloat(bidAmount) <= 0}
                className="w-full py-3.5 rounded-xl text-sm font-semibold btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Bid
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="w-full py-3.5 rounded-xl text-sm font-semibold btn-gold"
              >
                Connect Wallet to Bid
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
