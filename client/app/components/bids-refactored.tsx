"use client";

/**
 * Bids Component - Refactored with Error Handling (SUR-19)
 * 
 * This is a refactored version of bids.tsx with:
 * - Centralized error handling via useErrorHandler
 * - Real-time bid validation
 * - Transaction state management
 * - Better error boundaries
 * - Retry logic for network operations
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useAccount, useExplorer, useProvider } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Components
import { MonsterCollectionCard, AdventurerCollectionCard } from "./cards";
import { Pagination, BidPriceChart, CustomDropdown, InfoTooltip, AddressDisplay, CountdownTimer } from "./ui";
import { Filters, type FilterState } from "./filters";
import { BidsSkeleton } from "./skeletons";
import { BeastDetailModal, AdventurerDetailModal } from "./modals";
import { AuctionTimeline } from "./bid-components";
import { BidInputWithValidation, BidValidationSummary } from "./bid-input-with-validation";
import { TransactionState, ErrorState, LoadingState } from "./ui";
import { AuctionErrorBoundary, AuctionCardErrorBoundary, BidActionErrorBoundary } from "./error-boundaries";

// Providers
import { useWalletModal } from "../providers/wallet-modal-provider";
import { useToast } from "../providers/toast-provider";

// Hooks
import { usePaymaster } from "../hooks";
import { useBeastSkullRewards, useSummitLeaderboard, findMatchingSummitBeast, type SummitBeast } from "../hooks";

// Types
import type { AuctionItem, FormattedNFT, Collection, UserOffer } from "../lib/types";
import type { AuctionWithNFTs } from "../hooks";

// Utils
import {
  formatUSD,
  formatUSDSmart,
  formatTokenAmount,
  truncateAuctionName,
  getStatusLabel,
  getStatusStyle,
  isAuctionExpired,
  useErrorHandler,
  validateBidAmount,
  ErrorMessages,
  withRetry,
} from "../lib/utils";

// Constants
import {
  ADVENTURER_NFT_CONTRACT_ADDRESS,
  AUCTION_CONTRACT_ADDRESS,
  VAULT_CONTRACT_ADDRESS,
  DEFAULT_PAGE_SIZE,
  IMAGE_BASE_URL,
  SUPPORTED_TOKENS,
  USDC_ADDRESS,
} from "../lib/constants";

// External
import { uint256 } from "starknet";
import { fetchTokens, getQuotes, quoteToCalls } from "@avnu/avnu-sdk";
import { normalizeContractAddress, normalizeTokenId } from "../lib/utils/normalization";
import { getTokenPriceInUSDC, shouldRefetchPrice } from "../lib/utils/token-price-cache";
import { applyFiltersToAuctions } from "../lib/filter-utils";

// ============================================================================
// Types
// ============================================================================

interface BidsProps {
  auctions: AuctionWithNFTs[];
  loading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  getAuctionItems: (auctionId: string) => AuctionItem[];
  token: string | null;
}

type TransactionType = "bid" | "offer" | "settle" | "withdraw";
type TransactionStatusType = "pending" | "success" | "error";

interface TransactionStatus {
  type: TransactionType;
  status: TransactionStatusType;
  message: string;
  subMessage?: string;
  hash?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function BidsRefactored({
  auctions,
  loading,
  error: auctionsError,
  currentPage,
  totalPages,
  setCurrentPage,
  getAuctionItems,
  token,
}: BidsProps) {
  // Hooks
  const { account, address } = useAccount();
  const explorer = useExplorer();
  const provider = useProvider();
  const router = useRouter();
  const { openWalletModal } = useWalletModal();
  const { executeWithPaymaster } = usePaymaster();
  const { handleError, handleSuccess } = useErrorHandler();

  // Transaction status
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);

  // Bid state
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [bidTxnHash, setBidTxnHash] = useState<string | undefined>();

  // Offer state
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerTxnHash, setOfferTxnHash] = useState<string | undefined>();

  // Settle state
  const [isSettling, setIsSettling] = useState(false);
  const [settleTxnHash, setSettleTxnHash] = useState<string | undefined>();
  const [isRefunded, setIsRefunded] = useState(false);

  // Withdraw state
  const [isWithdrawingOffer, setIsWithdrawingOffer] = useState(false);
  const [withdrawTxnHash, setWithdrawTxnHash] = useState<string | undefined>();

  // User offer
  const [userOffer, setUserOffer] = useState<UserOffer | null>(null);

  // Filters and pagination
  const [filters, setFilters] = useState<FilterState>({
    id: "",
    search: "",
    beast: "",
    type: "",
    tier: "",
    levelMin: "",
    levelMax: "",
    powerMin: "",
    powerMax: "",
    rankMin: "",
    rankMax: "",
    shiny: "",
    animated: "",
    priceSort: "",
    tokenIdSort: "",
    summitTop15: "",
    timeSort: "ending-soon",
  });

  const [localCurrentPage, setLocalCurrentPage] = useState(currentPage);

  // Selection
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [paymentToken, setPaymentToken] = useState(USDC_ADDRESS);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);

  // UI state
  const [tokenLogos, setTokenLogos] = useState<Record<string, string>>({});
  const [tokenBalances, setTokenBalances] = useState<Record<string, { amount: string; usdValue: string | null }>>({});
  const [isBeastModalOpen, setIsBeastModalOpen] = useState(false);
  const [selectedBeastIndex, setSelectedBeastIndex] = useState(0);
  const [isAdventurerModalOpen, setIsAdventurerModalOpen] = useState(false);
  const [selectedAdventurerIndex, setSelectedAdventurerIndex] = useState(0);

  // Refs
  const hasAutoOpenedFromUrl = useRef(false);
  const nftCarouselRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const bidActionsRef = useRef<HTMLDivElement>(null);
  const priceRetryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Data Processing
  // ============================================================================

  const { topBeasts: summitTopBeasts, error: summitError } = useSummitLeaderboard(15);

  const auctionHasSummitBeast = useCallback((auction: AuctionWithNFTs) => {
    if (!summitTopBeasts.length || !auction.nfts?.length) return false;
    return auction.nfts.some(nft => {
      const tokenId = nft.tokenId.startsWith("0x") ? parseInt(nft.tokenId, 16) : parseInt(nft.tokenId);
      const prefix = nft.attributes?.find(a => a.trait_type === "Prefix")?.value;
      const suffix = nft.attributes?.find(a => a.trait_type === "Suffix")?.value;
      return findMatchingSummitBeast(String(prefix), String(suffix), nft.beastName, tokenId, summitTopBeasts) !== null;
    });
  }, [summitTopBeasts]);

  const summitListedCount = useMemo(() => {
    if (summitError) return 0;
    return auctions.filter(auction => auctionHasSummitBeast(auction)).length;
  }, [auctions, auctionHasSummitBeast, summitError]);

  const filteredAuctions = useMemo(() => {
    let result = applyFiltersToAuctions(auctions, filters);
    if (filters.summitTop15) {
      if (summitTopBeasts.length === 0) return [];
      result = result.filter(auction => auctionHasSummitBeast(auction));
    }
    // Time sorting
    if (filters.timeSort === "ending-soon") {
      const now = Math.floor(Date.now() / 1000);
      result = [...result].sort((a, b) => {
        const getEndTime = (auction: AuctionWithNFTs) => {
          const endTimeStr = auction.end_time || "0";
          return endTimeStr.startsWith("0x") ? parseInt(endTimeStr, 16) : parseInt(endTimeStr, 10);
        };
        const isActive = (auction: AuctionWithNFTs) => parseInt(auction.status) === 2 && getEndTime(auction) > now;
        const activeA = isActive(a), activeB = isActive(b);
        if (activeA && !activeB) return -1;
        if (!activeA && activeB) return 1;
        return getEndTime(a) - getEndTime(b);
      });
    }
    return result;
  }, [auctions, filters, summitTopBeasts, auctionHasSummitBeast]);

  const totalFilteredPages = useMemo(() => 
    Math.max(1, Math.ceil(filteredAuctions.length / DEFAULT_PAGE_SIZE)),
    [filteredAuctions.length]
  );

  const paginatedFilteredAuctions = useMemo(() => {
    const startIndex = (localCurrentPage - 1) * DEFAULT_PAGE_SIZE;
    return filteredAuctions.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
  }, [filteredAuctions, localCurrentPage]);

  useEffect(() => setLocalCurrentPage(1), [filters]);
  useEffect(() => setLocalCurrentPage(currentPage), [currentPage]);

  const collections: Collection[] = useMemo(() => 
    paginatedFilteredAuctions.map((auction) => {
      const startingPriceStr = auction.starting_price || "0";
      const startingPrice = startingPriceStr.startsWith("0x") 
        ? parseInt(startingPriceStr, 16) 
        : parseFloat(startingPriceStr);
      const highestBid = auction.current_bid
        ? (parseInt(auction.current_bid, auction.current_bid.startsWith("0x") ? 16 : 10) / 1e6)
        : undefined;
      return {
        id: String(auction.auction_id),
        name: truncateAuctionName(auction.name),
        fullName: auction.name,
        totalMonsters: parseInt(auction.item_count) || 0,
        startingPrice,
        highestBid,
        image: "/logo.png",
        status: auction.status,
        endTime: auction.end_time,
        sellerFull: auction.seller,
        highestBidderFull: auction.highest_bidder,
        executedAt: auction.executedAt,
      };
    }),
    [paginatedFilteredAuctions]
  );

  const selectedCollection = useMemo(() => 
    collections.find((c) => c.id === selectedCollectionId),
    [selectedCollectionId, collections]
  );

  // Calculate minimum bid
  const minBid = useMemo(() => {
    if (!selectedCollection) return 0;
    const hasHighestBid = selectedCollection.highestBid !== undefined && selectedCollection.highestBid > 0;
    const basePrice = hasHighestBid ? selectedCollection.highestBid! : selectedCollection.startingPrice / 1e6;
    return basePrice * 1.02;
  }, [selectedCollection]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handlePlaceBid = useCallback(async () => {
    if (!account || !address || !selectedCollectionId || !selectedCollection) {
      handleError(new Error(ErrorMessages.WALLET_NOT_CONNECTED), {
        component: "BidsRefactored",
        action: "place_bid",
        auctionId: selectedCollectionId,
      });
      return;
    }

    // Validate bid
    const validation = validateBidAmount(bidAmount, minBid);
    if (!validation.valid) {
      handleError(new Error(validation.error || ErrorMessages.INVALID_BID_AMOUNT), {
        component: "BidsRefactored",
        action: "place_bid",
      });
      return;
    }

    setTransactionStatus({
      type: "bid",
      status: "pending",
      message: "Preparing your bid...",
    });
    setIsSubmittingBid(true);

    try {
      const auctionId = parseInt(selectedCollectionId, 10);
      const usdcAmount = parseFloat(bidAmount);
      const finalUSDAmount = Math.floor(usdcAmount * 1e6);

      // Build and execute transaction
      const calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }> = [];

      if (paymentToken.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        // Multi-token path with AVNU swap
        await buildMultiTokenBidCalls(calls, paymentToken, finalUSDAmount, address, provider, tokenPrice, auctionId);
      } else {
        // USDC direct path
        await buildUSDCBidCalls(calls, finalUSDAmount, address, provider, auctionId);
      }

      setTransactionStatus({
        type: "bid",
        status: "pending",
        message: "Submitting to blockchain...",
        subMessage: "Please confirm in your wallet if prompted",
      });

      const response = await executeWithPaymaster(account, calls);
      
      setBidTxnHash(response.transaction_hash);
      setBidAmount("");
      
      setTransactionStatus({
        type: "bid",
        status: "success",
        message: "Bid placed successfully!",
        hash: response.transaction_hash,
      });

      handleSuccess("Bid placed", `You bid ${formatUSD(usdcAmount)} USDC`);
    } catch (err) {
      const errorInfo = handleError(err, {
        component: "BidsRefactored",
        action: "place_bid",
        auctionId: selectedCollectionId,
        additionalData: { bidAmount, minBid, paymentToken },
      });

      setTransactionStatus({
        type: "bid",
        status: "error",
        message: errorInfo.error || ErrorMessages.UNKNOWN_ERROR,
      });
    } finally {
      setIsSubmittingBid(false);
    }
  }, [account, address, selectedCollectionId, selectedCollection, bidAmount, minBid, paymentToken, tokenPrice, provider, executeWithPaymaster, handleError, handleSuccess]);

  // Helper functions for building calls
  async function buildMultiTokenBidCalls(
    calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }>,
    paymentToken: string,
    usdcAmount: number,
    address: string,
    provider: any,
    tokenPrice: number | null,
    auctionId: number
  ) {
    // Implementation same as original but with better error handling
    const paymentTokenInfo = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === paymentToken.toLowerCase());
    if (!paymentTokenInfo) throw new Error("Invalid payment token");
    if (!tokenPrice || !isFinite(tokenPrice)) throw new Error("Unable to get token price");

    const tokenAmountNeeded = usdcAmount / 1e6 / tokenPrice;
    const tokenAmountWei = BigInt(Math.floor(tokenAmountNeeded * Math.pow(10, paymentTokenInfo.decimals)));

    // Check balance
    const balanceResult = await provider.provider.callContract({
      contractAddress: paymentToken,
      entrypoint: "balanceOf",
      calldata: [address],
    });

    if (!balanceResult || balanceResult.length < 2) {
      throw new Error("Invalid balance response");
    }

    const balance = BigInt(balanceResult[0]) + (BigInt(balanceResult[1]) << BigInt(128));
    if (balance < (tokenAmountWei * 102n) / 100n) {
      throw new Error(ErrorMessages.INSUFFICIENT_FUNDS);
    }

    // Get AVNU quotes with retry
    const quotes = await withRetry(
      () => getQuotes({
        sellTokenAddress: paymentToken,
        buyTokenAddress: USDC_ADDRESS,
        sellAmount: tokenAmountWei,
        takerAddress: address,
      }),
      { maxRetries: 2, delayMs: 1000 }
    );

    if (!quotes?.length) throw new Error("No swap quotes available");

    const bestQuote = quotes[0];
    const slippage = 0.01;

    const swapCallsResult = await quoteToCalls({ quoteId: bestQuote.quoteId, slippage });
    const swapCalls = (swapCallsResult.calls || [swapCallsResult]).filter((call: any) => call.entrypoint !== "approve");

    if (!swapCalls.length) throw new Error("No swap calls available");

    // Add approval
    const routerAddress = swapCalls[0]?.contractAddress;
    if (!routerAddress) throw new Error("Unable to determine router address");

    const approvalAmount = uint256.bnToUint256((bestQuote.sellAmount * 102n) / 100n);
    calls.push({
      contractAddress: paymentToken,
      entrypoint: "approve",
      calldata: [routerAddress, approvalAmount.low.toString(), approvalAmount.high.toString()],
    });

    // Add swap calls
    swapCalls.forEach((call: any) => {
      calls.push({
        contractAddress: call.contractAddress,
        entrypoint: call.entrypoint,
        calldata: Array.isArray(call.calldata) ? call.calldata.map((arg: any) => String(arg)) : [],
      });
    });

    // Approve USDC and bid
    const buyAmount = typeof bestQuote.buyAmount === "bigint" ? bestQuote.buyAmount : BigInt(Math.floor(Number(bestQuote.buyAmount)));
    const minBuyAmount = (buyAmount * BigInt(Math.floor((1 - slippage) * 10000))) / 10000n;
    const usdcApproval = uint256.bnToUint256(minBuyAmount);

    calls.push({
      contractAddress: USDC_ADDRESS,
      entrypoint: "approve",
      calldata: [VAULT_CONTRACT_ADDRESS, usdcApproval.low.toString(), usdcApproval.high.toString()],
    });

    calls.push({
      contractAddress: AUCTION_CONTRACT_ADDRESS,
      entrypoint: "bid",
      calldata: [auctionId.toString(), minBuyAmount.toString()],
    });
  }

  async function buildUSDCBidCalls(
    calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }>,
    usdcAmount: number,
    address: string,
    provider: any,
    auctionId: number
  ) {
    const balanceResult = await provider.provider.callContract({
      contractAddress: USDC_ADDRESS,
      entrypoint: "balanceOf",
      calldata: [address],
    });

    if (!balanceResult || balanceResult.length < 2) {
      throw new Error("Invalid balance response");
    }

    const balance = BigInt(balanceResult[0]) + (BigInt(balanceResult[1]) << BigInt(128));
    if (balance < BigInt(usdcAmount)) {
      throw new Error(ErrorMessages.INSUFFICIENT_FUNDS);
    }

    const approvalAmount = uint256.bnToUint256((BigInt(usdcAmount) * 102n) / 100n);
    calls.push({
      contractAddress: USDC_ADDRESS,
      entrypoint: "approve",
      calldata: [VAULT_CONTRACT_ADDRESS, approvalAmount.low.toString(), approvalAmount.high.toString()],
    });

    calls.push({
      contractAddress: AUCTION_CONTRACT_ADDRESS,
      entrypoint: "bid",
      calldata: [auctionId.toString(), usdcAmount.toString()],
    });
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return <BidsSkeleton />;
  }

  if (auctionsError) {
    return (
      <ErrorState
        title="Failed to Load Auctions"
        message={auctionsError.message || "Unable to fetch auction data"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <AuctionErrorBoundary>
      <div className="w-full">
        {/* Transaction Status */}
        {transactionStatus && (
          <div className="mb-4">
            <TransactionState
              status={transactionStatus.status}
              message={transactionStatus.message}
              subMessage={transactionStatus.subMessage}
              txHash={transactionStatus.hash}
              onClose={() => setTransactionStatus(null)}
            />
          </div>
        )}

        {/* Main Content */}
        {collections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-400">No active auctions</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Collection Cards */}
            {collections.map((collection) => (
              <AuctionCardErrorBoundary key={collection.id}>
                <div className="p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-bold">{collection.name}</h3>
                  <p className="text-sm text-gray-400">
                    Min bid: {formatUSD(minBid)}
                  </p>
                </div>
              </AuctionCardErrorBoundary>
            ))}

            {/* Selected Auction Detail */}
            {selectedCollection && (
              <BidActionErrorBoundary>
                <div className="p-6 border border-[rgb(50,255,52)]/30 rounded-lg bg-black/40">
                  <h2 className="text-xl font-bold mb-4">{selectedCollection.name}</h2>
                  
                  <BidInputWithValidation
                    value={bidAmount}
                    onChange={setBidAmount}
                    minBid={minBid}
                    disabled={isSubmittingBid}
                    label="Your Bid (USDC)"
                  />

                  <div className="mt-4">
                    <BidValidationSummary
                      bidAmount={bidAmount}
                      minBid={minBid}
                      userBalance={1000} // TODO: Fetch real balance
                      tokenSymbol="USDC"
                    />
                  </div>

                  <button
                    onClick={handlePlaceBid}
                    disabled={!account || isSubmittingBid}
                    className={`
                      w-full mt-4 py-3 px-4 rounded-lg font-orbitron uppercase tracking-wider
                      transition-all duration-200
                      ${account && !isSubmittingBid
                        ? "bg-[rgb(50,255,52)] text-black hover:bg-[rgb(40,220,42)]"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                      }
                    `}
                  >
                    {isSubmittingBid ? "Submitting..." : "Place Bid"}
                  </button>
                </div>
              </BidActionErrorBoundary>
            )}
          </div>
        )}
      </div>
    </AuctionErrorBoundary>
  );
}
