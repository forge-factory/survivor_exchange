"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { FormattedNFT } from "../../lib/types";
import { CustomDropdown, InfoTooltip, CountdownTimer, type DropdownOption } from "../ui";
import { formatUSDSmart } from "../../lib/utils";
import { copyAuctionLink } from "../../lib/utils/share-utils";

/** Auction bid data for displaying price info */
interface AuctionBidData {
  startingPrice: number; // In USDC (already divided by 1e6)
  highestBid?: number; // In USDC (already divided by 1e6)
  status: string;
  endTime: string;
  isUserSeller: boolean;
}

/** Bid state from parent component */
interface BidState {
  bidAmount: string;
  isSubmitting: boolean;
  isSubmittingOffer: boolean;
  hasActiveOffer: boolean;
  account: boolean; // whether user is connected
  paymentToken: string; // currently selected payment token address
  tokenSymbol: string; // symbol of selected token (e.g., "USDC", "ETH")
  insufficientFundsError?: string; // error message when user doesn't have enough funds
}

interface AdventurerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nfts: FormattedNFT[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onSelect?: (tokenId: string) => void;
  isSelected?: boolean;
  /** When viewing adventurers in an auction context */
  auctionId?: string;
  /** Auction data for displaying bid info and enabling bid/offer actions */
  auctionBidData?: AuctionBidData;
  /** Current bid state from parent */
  bidState?: BidState;
  /** Token options for payment selector */
  tokenOptions?: DropdownOption[];
  /** Callback when bid amount changes */
  onBidAmountChange?: (amount: string) => void;
  /** Callback when payment token changes */
  onPaymentTokenChange?: (token: string) => void;
  /** Callback to place a bid */
  onPlaceBid?: () => void;
  /** Callback to make an offer */
  onMakeOffer?: () => void;
  /** Callback to open wallet modal */
  onOpenWallet?: () => void;
}

/** Metadata attribute from NFT metadata or Torii SQL */
interface MetadataAttribute {
  trait_type: string;
  value: string | number;
}

/** Full metadata from API */
interface AdventurerMetadata {
  image: string;
  name: string;
  description: string;
}

/** Combined adventurer data from multiple API sources */
interface AdventurerData {
  metadata: AdventurerMetadata | null;
  attributes: MetadataAttribute[];
}

// Client-side cache for fetched data
const dataCache = new Map<string, AdventurerData>();

export default function AdventurerDetailModal({
  isOpen,
  onClose,
  nfts,
  currentIndex,
  onNavigate,
  onSelect,
  isSelected,
  auctionId,
  auctionBidData,
  bidState,
  tokenOptions,
  onBidAmountChange,
  onPaymentTokenChange,
  onPlaceBid,
  onMakeOffer,
  onOpenWallet,
}: AdventurerDetailModalProps) {
  const currentNft = nfts[currentIndex];
  const [adventurerData, setAdventurerData] = useState<AdventurerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Parse token ID
  const tokenIdNum = currentNft?.tokenId.startsWith("0x")
    ? parseInt(currentNft.tokenId, 16)
    : parseInt(currentNft?.tokenId || "0", 10);

  // Fetch metadata and attributes when modal opens or NFT changes
  useEffect(() => {
    if (!isOpen || !currentNft) {
      setAdventurerData(null);
      return;
    }

    const cached = dataCache.get(currentNft.tokenId);
    if (cached) {
      setAdventurerData(cached);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch both metadata (image) and attributes (Level, XP) in parallel
        const [metadataResponse, attributesResponse] = await Promise.all([
          fetch(`/api/adventurer-image/${tokenIdNum}`),
          fetch(`/api/adventurer-attributes/${tokenIdNum}`),
        ]);

        let metadata: AdventurerMetadata | null = null;
        let attributes: MetadataAttribute[] = [];

        // Parse metadata response
        if (metadataResponse.ok) {
          const metaData = await metadataResponse.json();
          if (metaData.metadata) {
            metadata = {
              image: metaData.metadata.image || "",
              name: metaData.metadata.name || `Adventurer #${tokenIdNum}`,
              description: metaData.metadata.description || "",
            };
          }
        }

        // Parse attributes response (from Torii SQL - has Level, XP, etc.)
        if (attributesResponse.ok) {
          const attrData = await attributesResponse.json();
          if (attrData.attributes && Array.isArray(attrData.attributes)) {
            attributes = attrData.attributes;
          }
        }

        const data: AdventurerData = { metadata, attributes };
        dataCache.set(currentNft.tokenId, data);
        setAdventurerData(data);
      } catch (error) {
        console.error("Failed to fetch adventurer data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, currentNft, tokenIdNum]);

  // Helper to get attribute from fetched data or NFT
  const getAttribute = (traitType: string): string | undefined => {
    // First try attributes from Torii SQL (most reliable source)
    if (adventurerData?.attributes) {
      const attr = adventurerData.attributes.find((a) => a.trait_type === traitType);
      if (attr) return String(attr.value);
    }
    // Fall back to NFT attributes passed from parent
    const nftAttr = currentNft?.attributes.find((a) => a.trait_type === traitType);
    return nftAttr ? String(nftAttr.value) : undefined;
  };

  const playerName = getAttribute("Player Name") || adventurerData?.metadata?.name || currentNft?.metadataName || "Unknown";
  const xp = getAttribute("XP") || getAttribute("Score") || "0";
  const level = getAttribute("Level") || "0";
  const gameName = getAttribute("Game Name") || "Death Mountain";
  const gameOver = getAttribute("Game Over") === "True" || getAttribute("Game Over") === "true";

  // Reset link copied state when navigating or closing
  useEffect(() => {
    setLinkCopied(false);
  }, [currentIndex, isOpen]);

  // Clear link copied feedback after 3 seconds
  useEffect(() => {
    if (linkCopied) {
      const timer = setTimeout(() => setLinkCopied(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [linkCopied]);

  // Copy Link handler - copies auction link when in auction context
  const handleCopyLink = useCallback(async () => {
    if (!auctionId) return;
    const success = await copyAuctionLink(auctionId);
    setLinkCopied(success);
  }, [auctionId]);

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

  // Check if we're in an active auction context
  const isActiveAuction = auctionId && auctionBidData && bidState && parseInt(auctionBidData.status) === 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-h-[90vh] bg-black/95 border-2 border-[rgb(50,255,52)]/60 rounded-2xl shadow-[0_0_40px_rgba(50,255,52,0.2)] my-auto flex flex-col overflow-hidden ${
          isActiveAuction ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(50,255,52)]/30">
          <h2 className="text-lg font-orbitron uppercase tracking-wider text-white">
            Adventurer
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
            {/* Copy Link button (only in auction context) */}
            {auctionId && (
              <button
                onClick={handleCopyLink}
                aria-label="Copy link to this auction"
                title={linkCopied ? "Copied!" : "Copy Auction Link"}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                  linkCopied
                    ? "border-green-500/60 bg-green-500/20 text-green-400"
                    : "border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/20"
                }`}
              >
                {linkCopied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </button>
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
        <div className={`p-6 flex-1 overflow-y-auto ${isActiveAuction ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col items-center gap-4"}`}>
          {/* Left column - Image and basic info */}
          <div className="flex flex-col items-center gap-4">
            {/* Image - Large and centered */}
            <div className="relative w-64 h-64 rounded-xl border-2 border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/5 overflow-hidden flex items-center justify-center">
              {loading ? (
                <div className="animate-pulse w-24 h-24 rounded-full bg-[rgb(50,255,52)]/10" />
              ) : adventurerData?.metadata?.image ? (
                <Image
                  src={adventurerData.metadata.image}
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

            {/* Player Name */}
            <h3 className="text-xl font-orbitron text-white text-center">{playerName}</h3>

            {/* Level & XP */}
            <div className="flex items-center justify-center gap-8 py-2">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-orbitron font-bold text-white">
                  {level}
                </span>
                <span className="text-sm uppercase tracking-wider text-[rgb(186,255,188)]/50">
                  Level
                </span>
              </div>
              <div className="w-px h-12 bg-[rgb(50,255,52)]/30" />
              <div className="flex flex-col items-center">
                <span className="text-3xl font-orbitron font-bold text-[rgb(50,255,52)]">
                  {parseInt(xp).toLocaleString()}
                </span>
                <span className="text-sm uppercase tracking-wider text-[rgb(186,255,188)]/50">
                  XP
                </span>
              </div>
            </div>

            {/* Select Button (only when not in auction context) */}
            {onSelect && !isActiveAuction && (
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

          {/* Right column - Auction bidding UI (only shown in auction context) */}
          {isActiveAuction && (
            <div className="flex flex-col gap-4">
              {/* Price info */}
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-[rgb(50,255,52)]/20 bg-[rgb(50,255,52)]/5 px-4 py-3">
                  <p className="text-[10px] font-orbitron uppercase tracking-wider text-[rgb(186,255,188)]/50">
                    Reserve
                  </p>
                  <p className="text-lg font-orbitron text-white">
                    {formatUSDSmart(auctionBidData.startingPrice)}
                  </p>
                </div>
                <div className={`rounded-lg border px-4 py-3 ${
                  auctionBidData.highestBid && auctionBidData.highestBid > 0
                    ? "border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/10"
                    : "border-white/20 bg-white/5"
                }`}>
                  <p className={`text-[10px] font-orbitron uppercase tracking-wider ${
                    auctionBidData.highestBid && auctionBidData.highestBid > 0
                      ? "text-[rgb(50,255,52)]"
                      : "text-[rgb(186,255,188)]/50"
                  }`}>
                    Highest Bid
                  </p>
                  <p className={`text-lg font-orbitron ${
                    auctionBidData.highestBid && auctionBidData.highestBid > 0
                      ? "text-[rgb(50,255,52)]"
                      : "text-white/50"
                  }`}>
                    {auctionBidData.highestBid && auctionBidData.highestBid > 0
                      ? formatUSDSmart(auctionBidData.highestBid)
                      : "Be first!"}
                  </p>
                </div>
                {/* Countdown timer */}
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                  <p className="text-[10px] font-orbitron uppercase tracking-wider text-orange-400/70">
                    Ends In
                  </p>
                  <p className="text-lg font-orbitron text-orange-400">
                    <CountdownTimer
                      endTime={auctionBidData.endTime}
                      status={auctionBidData.status}
                    />
                  </p>
                </div>
              </div>

              {/* Bid input and actions (only for non-sellers) */}
              {!auctionBidData.isUserSeller && (
                <>
                  {/* Token selector */}
                  {tokenOptions && tokenOptions.length > 0 && onPaymentTokenChange && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-orbitron uppercase tracking-wider text-[rgb(186,255,188)]/70">
                        Pay With
                      </label>
                      <CustomDropdown
                        id="adventurer-modal-payment-token"
                        value={bidState.paymentToken}
                        onChange={onPaymentTokenChange}
                        options={tokenOptions}
                        variant="green"
                        className="w-full"
                      />
                      {bidState.insufficientFundsError && (
                        <p className="text-xs text-red-400">
                          {bidState.insufficientFundsError}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-orbitron uppercase tracking-wider text-[rgb(186,255,188)]/70">
                      Your Bid (USDC)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount..."
                      value={bidState.bidAmount}
                      onChange={(e) => onBidAmountChange?.(e.target.value)}
                      className="w-full rounded-lg border border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/5 px-4 py-3 text-sm font-orbitron text-white outline-none transition focus:border-[rgb(50,255,52)] focus:ring-2 focus:ring-[rgb(50,255,52)]/35 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Quick bid buttons */}
                  {(() => {
                    const hasHighestBid = auctionBidData.highestBid !== undefined && auctionBidData.highestBid > 0;
                    const basePrice = hasHighestBid
                      ? auctionBidData.highestBid!
                      : auctionBidData.startingPrice;
                    const minBid = basePrice * 1.02;
                    const midBid = basePrice * 1.5;
                    const highBid = basePrice * 2;

                    return (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => onBidAmountChange?.(minBid.toFixed(2))}
                          className="px-3 py-1.5 text-[10px] font-orbitron uppercase tracking-wider rounded-md border border-[rgb(50,255,52)]/30 bg-[rgb(50,255,52)]/5 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/15 transition"
                        >
                          +2%
                        </button>
                        <button
                          type="button"
                          onClick={() => onBidAmountChange?.(midBid.toFixed(2))}
                          className="px-3 py-1.5 text-[10px] font-orbitron uppercase tracking-wider rounded-md border border-[rgb(50,255,52)]/30 bg-[rgb(50,255,52)]/5 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/15 transition"
                        >
                          1.5x
                        </button>
                        <button
                          type="button"
                          onClick={() => onBidAmountChange?.(highBid.toFixed(2))}
                          className="px-3 py-1.5 text-[10px] font-orbitron uppercase tracking-wider rounded-md border border-[rgb(50,255,52)]/30 bg-[rgb(50,255,52)]/5 text-[rgb(50,255,52)] hover:bg-[rgb(50,255,52)]/15 transition"
                        >
                          2x
                        </button>
                      </div>
                    );
                  })()}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onPlaceBid}
                        disabled={
                          !bidState.account ||
                          bidState.isSubmitting ||
                          !bidState.bidAmount ||
                          parseFloat(bidState.bidAmount) <= 0
                        }
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-11 text-xs font-orbitron uppercase tracking-[0.12em] transition whitespace-nowrap ${
                          bidState.account &&
                          !bidState.isSubmitting &&
                          bidState.bidAmount &&
                          parseFloat(bidState.bidAmount) > 0
                            ? "bg-[rgb(50,255,52)] text-black font-bold hover:cursor-pointer hover:bg-[rgb(40,220,42)] shadow-[0_0_12px_rgba(50,255,52,0.4)]"
                            : "border border-white/12 text-[rgb(186,255,188)]/45 cursor-not-allowed"
                        }`}
                      >
                        <span>{bidState.isSubmitting ? "..." : "Place Bid"}</span>
                        {!bidState.isSubmitting && (
                          <InfoTooltip content="Compete in the auction. Your bid must be higher than the current highest bid." />
                        )}
                      </button>
                      {!bidState.hasActiveOffer && (
                        <button
                          type="button"
                          onClick={onMakeOffer}
                          disabled={
                            !bidState.account ||
                            bidState.isSubmittingOffer ||
                            !bidState.bidAmount ||
                            parseFloat(bidState.bidAmount) <= 0
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-11 text-xs font-orbitron uppercase tracking-[0.12em] transition whitespace-nowrap ${
                            bidState.account &&
                            !bidState.isSubmittingOffer &&
                            bidState.bidAmount &&
                            parseFloat(bidState.bidAmount) > 0
                              ? "border border-blue-500 bg-blue-500/10 text-blue-500 hover:cursor-pointer hover:bg-blue-500 hover:text-black"
                              : "border border-white/12 text-[rgb(186,255,188)]/45 cursor-not-allowed"
                          }`}
                        >
                          <span>{bidState.isSubmittingOffer ? "..." : "Make Offer"}</span>
                          {!bidState.isSubmittingOffer && (
                            <InfoTooltip content="Make a direct buyout offer to the seller. If accepted, the auction ends immediately." />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Connect wallet prompt */}
                    {!bidState.account && (
                      <button
                        type="button"
                        onClick={onOpenWallet}
                        className="text-xs text-center text-[rgb(50,255,52)]/80 font-orbitron animate-pulse hover:text-[rgb(50,255,52)] hover:underline cursor-pointer transition-colors"
                      >
                        Connect wallet to place a bid →
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Seller notice */}
              {auctionBidData.isUserSeller && (
                <div className="text-center py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                  <p className="text-xs font-orbitron text-yellow-400">
                    You are the seller of this auction
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
