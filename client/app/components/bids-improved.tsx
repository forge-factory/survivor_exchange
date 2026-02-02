"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useAccount, useExplorer, useProvider } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MonsterCollectionCard, AdventurerCollectionCard } from "./cards";
import { ADVENTURER_NFT_CONTRACT_ADDRESS } from "../lib/constants";
import { Pagination, BidPriceChart, CustomDropdown, InfoTooltip, AddressDisplay, CountdownTimer } from "./ui";
import { Filters, type FilterState } from "./filters";
import { BidsSkeleton } from "./skeletons";
import { BeastDetailModal, AdventurerDetailModal } from "./modals";
import { AuctionTimeline } from "./bid-components";
import { useWalletModal } from "../providers/wallet-modal-provider";
import { useToast } from "../providers/toast-provider";
import type { AuctionItem, FormattedNFT, Collection, UserOffer } from "../lib/types";
import { AuctionWithNFTs, useBeastSkullRewards, useSummitLeaderboard, findMatchingSummitBeast, type SummitBeast, usePaymaster } from "../hooks";
import { uint256 } from "starknet";
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
import { applyFiltersToAuctions } from "../lib/filter-utils";
import {
  AUCTION_CONTRACT_ADDRESS,
  VAULT_CONTRACT_ADDRESS,
  DEFAULT_PAGE_SIZE,
  IMAGE_BASE_URL,
  SUPPORTED_TOKENS,
  USDC_ADDRESS,
} from "../lib/constants";
import { fetchTokens, getQuotes, quoteToCalls } from "@avnu/avnu-sdk";
import { normalizeContractAddress, normalizeTokenId } from "../lib/utils/normalization";
import {
  getTokenPriceInUSDC,
  shouldRefetchPrice,
} from "../lib/utils/token-price-cache";
import { TransactionState, ErrorState, LoadingState } from "./ui";

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

// Transaction status types
type TransactionType = "bid" | "offer" | "settle" | "withdraw";

interface TransactionStatus {
  type: TransactionType;
  status: "pending" | "success" | "error";
  message: string;
  hash?: string;
}

export default function Bids({
  auctions,
  loading,
  error,
  currentPage,
  setCurrentPage,
  getAuctionItems,
  token,
}: BidsProps) {
  const { account, address } = useAccount();
  const explorer = useExplorer();
  const provider = useProvider();
  const { openWalletModal } = useWalletModal();
  const toast = useToast();
  const { handleError, handleSuccess } = useErrorHandler();
  const { executeWithPaymaster } = usePaymaster();

  // Transaction status state
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);

  // Bid state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txnHash, setTxnHash] = useState<string | undefined>();
  const [bidValidationError, setBidValidationError] = useState<string | null>(null);

  // Offer state
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerTxnHash, setOfferTxnHash] = useState<string | undefined>();

  // Settle state
  const [isSettling, setIsSettling] = useState(false);
  const [settleTxnHash, setSettleTxnHash] = useState<string | undefined>();
  const [isRefunded, setIsRefunded] = useState(false);

  // Withdraw offer state
  const [isWithdrawingOffer, setIsWithdrawingOffer] = useState(false);
  const [withdrawOfferTxnHash, setWithdrawOfferTxnHash] = useState("");

  // User offer state
  const [userOffer, setUserOffer] = useState<UserOffer | null>(null);

  // Filters and selection state
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
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [bidAmountToken, setBidAmountToken] = useState<string>("");
  const [bidInputHighlight, setBidInputHighlight] = useState(false);
  const [paymentToken, setPaymentToken] = useState(USDC_ADDRESS);
  const [tokenLogos, setTokenLogos] = useState<Record<string, string>>({});
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<
    Record<string, { amount: string; usdValue: string | null }>
  >({});

  // Modal state
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

  // Fetch top 15 summit beasts
  const { topBeasts: summitTopBeasts, error: summitError } = useSummitLeaderboard(15);

  // Helper to check if auction contains any summit beasts
  const auctionHasSummitBeast = useCallback((auction: AuctionWithNFTs) => {
    if (!summitTopBeasts.length || !auction.nfts?.length) {
      return false;
    }

    return auction.nfts.some(nft => {
      const tokenId = nft.tokenId.startsWith("0x")
        ? parseInt(nft.tokenId, 16)
        : parseInt(nft.tokenId);
      const prefixAttr = nft.attributes?.find(a => a.trait_type === "Prefix")?.value;
      const suffixAttr = nft.attributes?.find(a => a.trait_type === "Suffix")?.value;
      const prefix = prefixAttr !== undefined ? String(prefixAttr) : undefined;
      const suffix = suffixAttr !== undefined ? String(suffixAttr) : undefined;
      const beastName = nft.beastName;

      return findMatchingSummitBeast(prefix, suffix, beastName, tokenId, summitTopBeasts) !== null;
    });
  }, [summitTopBeasts]);

  // Count auctions containing summit beasts
  const summitListedCount = useMemo(() => {
    if (summitError) return 0;
    return auctions.filter(auction => auctionHasSummitBeast(auction)).length;
  }, [auctions, auctionHasSummitBeast, summitError]);

  // Filter and sort auctions
  const filteredAuctions = useMemo(() => {
    let result = applyFiltersToAuctions(auctions, filters);

    // Apply summit filter if active
    if (filters.summitTop15) {
      if (summitTopBeasts.length === 0) {
        return [];
      }
      result = result.filter(auction => auctionHasSummitBeast(auction));
    }

    // Apply time-based sorting
    if (filters.timeSort === "ending-soon") {
      const now = Math.floor(Date.now() / 1000);
      result = [...result].sort((a, b) => {
        const getEndTime = (auction: AuctionWithNFTs) => {
          const endTimeStr = auction.end_time || "0";
          return endTimeStr.startsWith("0x") || endTimeStr.startsWith("0X")
            ? parseInt(endTimeStr, 16)
            : parseInt(endTimeStr, 10);
        };
        const isActive = (auction: AuctionWithNFTs) => {
          const status = parseInt(auction.status);
          const endTime = getEndTime(auction);
          return status === 2 && endTime > now;
        };

        const endTimeA = getEndTime(a);
        const endTimeB = getEndTime(b);
        const activeA = isActive(a);
        const activeB = isActive(b);

        if (activeA && !activeB) return -1;
        if (!activeA && activeB) return 1;

        return endTimeA - endTimeB;
      });
    } else if (filters.timeSort === "newest") {
      result = [...result].sort((a, b) => {
        const getEndTime = (auction: AuctionWithNFTs) => {
          const endTimeStr = auction.end_time || "0";
          return endTimeStr.startsWith("0x") || endTimeStr.startsWith("0X")
            ? parseInt(endTimeStr, 16)
            : parseInt(endTimeStr, 10);
        };
        const endTimeA = getEndTime(a);
        const endTimeB = getEndTime(b);
        return endTimeB - endTimeA;
      });
    }

    return result;
  }, [auctions, filters, summitTopBeasts, auctionHasSummitBeast]);

  // Pagination
  const totalFilteredPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAuctions.length / DEFAULT_PAGE_SIZE));
  }, [filteredAuctions.length]);

  const paginatedFilteredAuctions = useMemo(() => {
    const startIndex = (localCurrentPage - 1) * DEFAULT_PAGE_SIZE;
    return filteredAuctions.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
  }, [filteredAuctions, localCurrentPage]);

  // Reset page when filters change
  useEffect(() => {
    setLocalCurrentPage(1);
  }, [filters]);

  // Sync with parent page
  useEffect(() => {
    setLocalCurrentPage(currentPage);
  }, [currentPage]);

  // Build collections for display
  const collections: Collection[] = useMemo(() => {
    return paginatedFilteredAuctions.map((auction) => {
      const startingPriceStr = auction.starting_price || "0";
      const startingPrice =
        startingPriceStr.startsWith("0x") || startingPriceStr.startsWith("0X")
          ? parseInt(startingPriceStr, 16)
          : parseFloat(startingPriceStr);

      const highestBid = auction.current_bid
        ? (() => {
            const bidStr = auction.current_bid;
            const parsed =
              bidStr.startsWith("0x") || bidStr.startsWith("0X")
                ? parseInt(bidStr, 16)
                : parseFloat(bidStr);
            return parsed / 1e6;
          })()
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
    });
  }, [paginatedFilteredAuctions]);

  // Selected collection
  const selectedCollection = useMemo(() => {
    if (!selectedCollectionId) return undefined;
    return collections.find((c) => c.id === selectedCollectionId);
  }, [selectedCollectionId, collections]);

  // Validate bid amount with real-time feedback
  const validateBid = useCallback((amount: string, collection: Collection | undefined): string | null => {
    if (!collection) return "No auction selected";

    const hasHighestBid = collection.highestBid !== undefined && collection.highestBid > 0;
    const basePrice = hasHighestBid ? collection.highestBid! : collection.startingPrice / 1e6;
    const minBid = basePrice * 1.02;

    const validation = validateBidAmount(amount, minBid);
    return validation.valid ? null : validation.error || "Invalid bid amount";
  }, []);

  // Handle bid input change with validation
  const handleBidAmountChange = useCallback((value: string) => {
    setBidAmountToken(value);
    
    if (value && selectedCollection) {
      const error = validateBid(value, selectedCollection);
      setBidValidationError(error);
    } else {
      setBidValidationError(null);
    }
  }, [selectedCollection, validateBid]);

  // Check if bid is valid
  const isBidValid = useMemo(() => {
    if (!bidAmountToken || !selectedCollection) return false;
    const error = validateBid(bidAmountToken, selectedCollection);
    return error === null;
  }, [bidAmountToken, selectedCollection, validateBid]);

  // Handle place bid with improved error handling
  const handlePlaceBid = useCallback(async () => {
    if (!account || !address || !selectedCollectionId || !isBidValid || !selectedCollection) {
      handleError(new Error(ErrorMessages.WALLET_NOT_CONNECTED), {
        component: "Bids",
        action: "place_bid",
      });
      return;
    }

    // Check token price if needed
    if (paymentToken.toLowerCase() !== USDC_ADDRESS.toLowerCase() && 
        (tokenPrice === null || !isFinite(tokenPrice) || tokenPrice <= 0)) {
      handleError(new Error("Unable to get token price. Please try again."), {
        component: "Bids",
        action: "place_bid",
      });
      return;
    }

    setTransactionStatus({
      type: "bid",
      status: "pending",
      message: "Preparing your bid...",
    });

    try {
      setIsSubmitting(true);
      setTxnHash(undefined);

      const auctionId = parseInt(selectedCollectionId, 10);
      const usdcAmount = parseFloat(bidAmountToken);

      if (isNaN(usdcAmount) || usdcAmount <= 0) {
        throw new Error(ErrorMessages.INVALID_BID_AMOUNT);
      }

      // Validate minimum bid
      const hasHighestBid = selectedCollection.highestBid !== undefined && selectedCollection.highestBid > 0;
      const basePrice = hasHighestBid ? selectedCollection.highestBid! : selectedCollection.startingPrice / 1e6;
      const minimumBid = basePrice * 1.02;

      if (usdcAmount < minimumBid) {
        throw new Error(`Minimum bid is ${formatUSD(minimumBid)}`);
      }

      const finalUSDAmount = Math.floor(usdcAmount * 1e6);
      const calls: Array<{
        contractAddress: string;
        entrypoint: string;
        calldata: string[];
      }> = [];

      // Build transaction calls based on payment token
      if (paymentToken.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        // Multi-token payment path with AVNU swap
        await buildMultiTokenBidCalls(
          calls,
          paymentToken,
          finalUSDAmount,
          address,
          provider,
          tokenPrice,
          auctionId
        );
      } else {
        // USDC direct payment
        await buildUSDCBidCalls(calls, finalUSDAmount, address, provider, auctionId);
      }

      setTransactionStatus({
        type: "bid",
        status: "pending",
        message: "Submitting bid to blockchain...",
      });

      const response = await executeWithPaymaster(account, calls);
      
      setTxnHash(response.transaction_hash);
      setBidAmountToken("");
      setBidValidationError(null);
      
      setTransactionStatus({
        type: "bid",
        status: "success",
        message: "Bid placed successfully!",
        hash: response.transaction_hash,
      });

      handleSuccess("Bid placed", "Your bid has been submitted successfully");
    } catch (err) {
      const errorInfo = handleError(err, {
        component: "Bids",
        action: "place_bid",
        auctionId: selectedCollectionId,
      });

      setTransactionStatus({
        type: "bid",
        status: "error",
        message: errorInfo.error || ErrorMessages.UNKNOWN_ERROR,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    account,
    address,
    selectedCollectionId,
    selectedCollection,
    bidAmountToken,
    isBidValid,
    paymentToken,
    tokenPrice,
    provider,
    executeWithPaymaster,
    handleError,
    handleSuccess,
  ]);

  // Build multi-token bid calls
  async function buildMultiTokenBidCalls(
    calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }>,
    paymentToken: string,
    usdcAmount: number,
    address: string,
    provider: any,
    tokenPrice: number | null,
    auctionId: number
  ) {
    const paymentTokenInfo = SUPPORTED_TOKENS.find(
      (t) => t.address.toLowerCase() === paymentToken.toLowerCase(),
    );
    if (!paymentTokenInfo) {
      throw new Error("Invalid payment token");
    }

    if (tokenPrice === null || !isFinite(tokenPrice) || tokenPrice <= 0) {
      throw new Error("Unable to get token price");
    }

    // Calculate token amount needed
    const tokenAmountNeeded = usdcAmount / 1e6 / tokenPrice;
    const tokenAmountWei = BigInt(
      Math.floor(tokenAmountNeeded * Math.pow(10, paymentTokenInfo.decimals)),
    );

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
    const balanceWithBuffer = (tokenAmountWei * 102n) / 100n;

    if (balance < balanceWithBuffer) {
      throw new Error(ErrorMessages.INSUFFICIENT_FUNDS);
    }

    // Get AVNU quotes
    const quotes = await withRetry(
      () => getQuotes({
        sellTokenAddress: paymentToken,
        buyTokenAddress: USDC_ADDRESS,
        sellAmount: tokenAmountWei,
        takerAddress: address,
      }),
      { maxRetries: 2, delayMs: 1000 }
    );

    if (!quotes || quotes.length === 0) {
      throw new Error("No swap quotes available");
    }

    const bestQuote = quotes[0];
    const slippage = 0.01;

    const swapCallsResult = await quoteToCalls({
      quoteId: bestQuote.quoteId,
      slippage,
    });

    const allSwapCalls = swapCallsResult.calls || [swapCallsResult];
    const swapCalls = allSwapCalls.filter((call) => call.entrypoint !== "approve");

    if (swapCalls.length === 0) {
      throw new Error("No swap calls available from quote");
    }

    // Add approval
    const actualSellAmount = bestQuote.sellAmount;
    const paymentTokenApprovalAmount = (actualSellAmount * 102n) / 100n;
    const paymentTokenApproval = uint256.bnToUint256(paymentTokenApprovalAmount);
    const routerAddress = swapCalls[0]?.contractAddress;

    if (!routerAddress) {
      throw new Error("Unable to determine router address");
    }

    calls.push({
      contractAddress: paymentToken,
      entrypoint: "approve",
      calldata: [
        routerAddress,
        paymentTokenApproval.low.toString(),
        paymentTokenApproval.high.toString(),
      ],
    });

    // Add swap calls
    swapCalls.forEach((call) => {
      calls.push({
        contractAddress: call.contractAddress,
        entrypoint: call.entrypoint,
        calldata: Array.isArray(call.calldata)
          ? call.calldata.map((arg) => (typeof arg === "string" ? arg : String(arg)))
          : [],
      });
    });

    // Calculate minimum USDC and approve
    let buyAmount: bigint;
    if (typeof bestQuote.buyAmount === "bigint") {
      buyAmount = bestQuote.buyAmount;
    } else if (typeof bestQuote.buyAmount === "string") {
      buyAmount = BigInt(bestQuote.buyAmount);
    } else {
      buyAmount = BigInt(Math.floor(Number(bestQuote.buyAmount)));
    }

    const minBuyAmount = (buyAmount * BigInt(Math.floor((1 - slippage) * 10000))) / 10000n;
    const usdcApproval = uint256.bnToUint256(minBuyAmount);

    calls.push({
      contractAddress: USDC_ADDRESS,
      entrypoint: "approve",
      calldata: [
        VAULT_CONTRACT_ADDRESS,
        usdcApproval.low.toString(),
        usdcApproval.high.toString(),
      ],
    });

    // Add bid call
    calls.push({
      contractAddress: AUCTION_CONTRACT_ADDRESS,
      entrypoint: "bid",
      calldata: [auctionId.toString(), minBuyAmount.toString()],
    });
  }

  // Build USDC bid calls
  async function buildUSDCBidCalls(
    calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }>,
    usdcAmount: number,
    address: string,
    provider: any,
    auctionId: number
  ) {
    // Check USDC balance
    const usdcBalanceResult = await provider.provider.callContract({
      contractAddress: USDC_ADDRESS,
      entrypoint: "balanceOf",
      calldata: [address],
    });

    if (!usdcBalanceResult || usdcBalanceResult.length < 2) {
      throw new Error("Invalid balance response");
    }

    const usdcBalance = BigInt(usdcBalanceResult[0]) + (BigInt(usdcBalanceResult[1]) << BigInt(128));

    if (usdcBalance < BigInt(usdcAmount)) {
      throw new Error(ErrorMessages.INSUFFICIENT_FUNDS);
    }

    // Approve with 2% buffer
    const approvalAmountValue = (BigInt(usdcAmount) * 102n) / 100n;
    const approvalAmount = uint256.bnToUint256(approvalAmountValue);

    calls.push({
      contractAddress: USDC_ADDRESS,
      entrypoint: "approve",
      calldata: [
        VAULT_CONTRACT_ADDRESS,
        approvalAmount.low.toString(),
        approvalAmount.high.toString(),
      ],
    });

    calls.push({
      contractAddress: AUCTION_CONTRACT_ADDRESS,
      entrypoint: "bid",
      calldata: [auctionId.toString(), usdcAmount.toString()],
    });
  }

  // Rest of component continues...
  // (Additional handlers for offers, settlements, etc.)

  return (
    <div className="w-full">
      {/* Transaction Status Display */}
      {transactionStatus && (
        <div className="mb-4">
          <TransactionState
            status={transactionStatus.status}
            message={transactionStatus.message}
            txHash={transactionStatus.hash}
            onClose={() => setTransactionStatus(null)}
          />
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <BidsSkeleton />
      ) : error ? (
        <ErrorState
          title="Failed to Load Auctions"
          message={error.message || "Unable to fetch auction data. Please try again."}
          onRetry={() => window.location.reload()}
        />
      ) : collections.length === 0 ? (
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-12">
          {/* Empty state content */}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Auction list content */}
        </div>
      )}
    </div>
  );
}
