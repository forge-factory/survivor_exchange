"use client";

/**
 * Integration Example: Improved Error Handling
 * 
 * This file demonstrates how to integrate the new error handling
 * system into existing components. Copy patterns from here.
 */

import React, { useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { useToast } from "../app/providers/toast-provider";
import {
  useErrorHandler,
  validateBidAmount,
  ErrorMessages,
  withRetry,
} from "../app/lib/utils";
import {
  TransactionState,
  ErrorState,
  LoadingState,
} from "../app/components/ui";
import {
  BidInputWithValidation,
  BidValidationSummary,
} from "../app/components/bid-input-with-validation";
import {
  AuctionErrorBoundary,
  BidActionErrorBoundary,
} from "../app/components/error-boundaries";
import { useAuctionsWithRetry } from "../app/hooks";

// ============================================================================
// EXAMPLE 1: Improved Bid Component with Full Error Handling
// ============================================================================

interface ImprovedBidComponentProps {
  auctionId: string;
  minBid: number;
  onBidPlaced?: () => void;
}

export function ImprovedBidComponent({
  auctionId,
  minBid,
  onBidPlaced,
}: ImprovedBidComponentProps) {
  const { account, address } = useAccount();
  const toast = useToast();
  const { handleError, handleSuccess } = useErrorHandler();

  // Form state
  const [bidAmount, setBidAmount] = useState("");
  const [userBalance] = useState(1000); // Example: fetch from contract

  // Transaction state
  const [transactionStatus, setTransactionStatus] = useState<{
    type: "bid";
    status: "pending" | "success" | "error";
    message: string;
    hash?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate bid in real-time
  const validation = validateBidAmount(bidAmount, minBid);
  const isValid = validation.valid && bidAmount !== "";

  const handlePlaceBid = useCallback(async () => {
    // 1. Pre-flight checks
    if (!account || !address) {
      handleError(new Error(ErrorMessages.WALLET_NOT_CONNECTED), {
        component: "ImprovedBidComponent",
        action: "place_bid",
        auctionId,
      });
      return;
    }

    if (!isValid) {
      toast.error("Invalid bid", validation.error || "Please enter a valid bid amount");
      return;
    }

    // 2. Set transaction status
    setTransactionStatus({
      type: "bid",
      status: "pending",
      message: "Preparing your bid...",
    });
    setIsSubmitting(true);

    try {
      // 3. Execute with retry
      const result = await withRetry(
        async () => {
          setTransactionStatus({
            type: "bid",
            status: "pending",
            message: "Submitting to blockchain...",
          });

          // Simulate contract call
          // Replace with actual: await executeWithPaymaster(account, calls)
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return { transaction_hash: "0x1234..." };
        },
        {
          maxRetries: 2,
          delayMs: 1000,
          onRetry: (attempt, error) => {
            setTransactionStatus({
              type: "bid",
              status: "pending",
              message: `Retrying... (Attempt ${attempt}/2)`,
            });
          },
        }
      );

      // 4. Success handling
      setTransactionStatus({
        type: "bid",
        status: "success",
        message: "Bid placed successfully!",
        hash: result.transaction_hash,
      });

      handleSuccess("Bid placed", `You bid ${bidAmount} USDC`);
      setBidAmount("");
      onBidPlaced?.();
    } catch (err) {
      // 5. Error handling
      const errorInfo = handleError(err, {
        component: "ImprovedBidComponent",
        action: "place_bid",
        auctionId,
        additionalData: { bidAmount, minBid },
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
    auctionId,
    bidAmount,
    isValid,
    minBid,
    onBidPlaced,
    handleError,
    handleSuccess,
    toast,
  ]);

  return (
    <BidActionErrorBoundary>
      <div className="space-y-4">
        {/* Transaction Status */}
        {transactionStatus && (
          <TransactionState
            status={transactionStatus.status}
            message={transactionStatus.message}
            txHash={transactionStatus.hash}
            onClose={() => setTransactionStatus(null)}
          />
        )}

        {/* Bid Input with Validation */}
        <BidInputWithValidation
          value={bidAmount}
          onChange={setBidAmount}
          minBid={minBid}
          disabled={isSubmitting}
          label="Your Bid (USDC)"
        />

        {/* Validation Summary */}
        {bidAmount && (
          <BidValidationSummary
            bidAmount={bidAmount}
            minBid={minBid}
            userBalance={userBalance}
          />
        )}

        {/* Submit Button */}
        <button
          onClick={handlePlaceBid}
          disabled={!isValid || isSubmitting || !account}
          className={`
            w-full py-3 px-4 rounded-lg font-orbitron uppercase tracking-wider
            transition-all duration-200
            ${
              isValid && !isSubmitting && account
                ? "bg-[rgb(50,255,52)] text-black hover:bg-[rgb(40,220,42)]"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? "Submitting..." : "Place Bid"}
        </button>

        {!account && (
          <p className="text-sm text-center text-yellow-400">
            Connect wallet to place a bid
          </p>
        )}
      </div>
    </BidActionErrorBoundary>
  );
}

// ============================================================================
// EXAMPLE 2: Improved Auction List with Retry
// ============================================================================

export function ImprovedAuctionList() {
  const {
    auctions,
    loading,
    error,
    isRetrying,
    retryCount,
    refetch,
    lastUpdated,
  } = useAuctionsWithRetry();

  // Loading state
  if (loading && !isRetrying) {
    return (
      <LoadingState
        message="Loading auctions..."
        subMessage="Fetching latest data from Starknet"
        size="lg"
      />
    );
  }

  // Retry state
  if (isRetrying) {
    return (
      <LoadingState
        message={`Retrying... (Attempt ${retryCount}/3)`}
        subMessage="Connection issue, trying again"
        size="md"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to Load Auctions"
        message={error.message}
        onRetry={refetch}
        retryCount={retryCount}
        maxRetries={3}
      />
    );
  }

  // Empty state
  if (auctions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-400">No active auctions</p>
        <p className="text-sm text-gray-500 mt-2">
          Be the first to list your BEASTs!
        </p>
      </div>
    );
  }

  // Success state
  return (
    <AuctionErrorBoundary>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>{auctions.length} auctions found</span>
          {lastUpdated && (
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>

        <div className="grid gap-4">
          {auctions.map((auction) => (
            <AuctionCard key={auction.auction_id} auction={auction} />
          ))}
        </div>
      </div>
    </AuctionErrorBoundary>
  );
}

// ============================================================================
// EXAMPLE 3: Form with Validation
// ============================================================================

interface CreateAuctionFormData {
  name: string;
  startingPrice: string;
  reservePrice: string;
  duration: string;
  selectedNFTs: string[];
}

import {
  validateAuctionName,
  validateStartingPrice,
  validateReservePrice,
  validateAuctionDuration,
  validateNFTSelection,
} from "../app/lib/utils";

export function ImprovedCreateAuctionForm() {
  const { handleError, handleSuccess } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateAuctionFormData>({
    name: "",
    startingPrice: "",
    reservePrice: "",
    duration: "60",
    selectedNFTs: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateAuctionFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateAuctionFormData, string>> = {};

    // Validate name
    const nameResult = validateAuctionName(formData.name);
    if (!nameResult.valid) {
      newErrors.name = nameResult.error;
    }

    // Validate starting price
    const priceResult = validateStartingPrice(formData.startingPrice);
    if (!priceResult.valid) {
      newErrors.startingPrice = priceResult.error;
    }

    // Validate reserve price
    const reserveResult = validateReservePrice(
      formData.reservePrice,
      formData.startingPrice
    );
    if (!reserveResult.valid) {
      newErrors.reservePrice = reserveResult.error;
    }

    // Validate duration
    const durationResult = validateAuctionDuration(parseInt(formData.duration));
    if (!durationResult.valid) {
      newErrors.duration = durationResult.error;
    }

    // Validate NFT selection
    const nftResult = validateNFTSelection(formData.selectedNFTs);
    if (!nftResult.valid) {
      newErrors.selectedNFTs = nftResult.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      handleError(new Error("Please fix the errors in the form"), {
        component: "ImprovedCreateAuctionForm",
        action: "submit",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      handleSuccess("Auction created!", "Your auction is now live");

      // Reset form
      setFormData({
        name: "",
        startingPrice: "",
        reservePrice: "",
        duration: "60",
        selectedNFTs: [],
      });
    } catch (err) {
      handleError(err, {
        component: "ImprovedCreateAuctionForm",
        action: "submit",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Auction Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          className={`w-full px-4 py-2 rounded border ${
            errors.name ? "border-red-500" : "border-gray-600"
          }`}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Starting Price */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Starting Price (USDC)
        </label>
        <input
          type="text"
          value={formData.startingPrice}
          onChange={(e) =>
            setFormData({ ...formData, startingPrice: e.target.value })
          }
          className={`w-full px-4 py-2 rounded border ${
            errors.startingPrice ? "border-red-500" : "border-gray-600"
          }`}
        />
        {errors.startingPrice && (
          <p className="text-red-500 text-sm mt-1">{errors.startingPrice}</p>
        )}
      </div>

      {/* Reserve Price */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Reserve Price (optional)
        </label>
        <input
          type="text"
          value={formData.reservePrice}
          onChange={(e) =>
            setFormData({ ...formData, reservePrice: e.target.value })
          }
          className={`w-full px-4 py-2 rounded border ${
            errors.reservePrice ? "border-red-500" : "border-gray-600"
          }`}
        />
        {errors.reservePrice && (
          <p className="text-red-500 text-sm mt-1">{errors.reservePrice}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-[rgb(50,255,52)] text-black rounded font-bold"
      >
        {isSubmitting ? "Creating..." : "Create Auction"}
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 4: Auction Card with Error Boundary
// ============================================================================

import { AuctionCardErrorBoundary } from "../app/components/error-boundaries";

interface Auction {
  auction_id: string;
  name: string;
  current_bid: string;
  status: string;
}

function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <div className="p-4 border border-gray-700 rounded-lg">
      <h3 className="font-bold">{auction.name}</h3>
      <p className="text-sm text-gray-400">Status: {auction.status}</p>
      <p className="text-sm text-gray-400">Current bid: {auction.current_bid}</p>
    </div>
  );
}

export function AuctionListWithBoundaries({
  auctions,
}: {
  auctions: Auction[];
}) {
  return (
    <div className="space-y-4">
      {auctions.map((auction) => (
        <AuctionCardErrorBoundary key={auction.auction_id}>
          <AuctionCard auction={auction} />
        </AuctionCardErrorBoundary>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Complex Async Operation with Full Error Handling
// ============================================================================

export function useComplexAuctionOperation() {
  const { handleError, handleSuccess } = useErrorHandler();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const execute = useCallback(
    async (auctionId: string, operations: string[]) => {
      setStatus("loading");

      try {
        // Step 1: Validate
        if (!auctionId || operations.length === 0) {
          throw new Error("Invalid parameters");
        }

        // Step 2: Execute with retry
        const result = await withRetry(
          async () => {
            // Simulate complex operation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return { success: true, data: { auctionId, operations } };
          },
          {
            maxRetries: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
              console.log(`Retry ${attempt}: ${error}`);
            },
          }
        );

        // Step 3: Success
        setStatus("success");
        handleSuccess("Operation complete", `Processed ${operations.length} items`);

        return result;
      } catch (err) {
        // Step 4: Error handling
        setStatus("error");
        handleError(err, {
          component: "useComplexAuctionOperation",
          action: "execute",
          auctionId,
          additionalData: { operations },
        });

        throw err;
      }
    },
    [handleError, handleSuccess]
  );

  return { execute, status };
}

// ============================================================================
// Summary: Key Patterns to Remember
// ============================================================================

/**
 * 1. Always wrap async operations with try-catch
 * 2. Use handleError with context for better debugging
 * 3. Use withRetry for network operations
 * 4. Validate inputs before submitting
 * 5. Show transaction states with TransactionState
 * 6. Use error boundaries for component isolation
 * 7. Provide retry functionality on errors
 * 8. Use standardized error messages
 */
