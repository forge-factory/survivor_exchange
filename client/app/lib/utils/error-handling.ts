/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { useToast } from "../../providers/toast-provider";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorContext {
  component?: string;
  action?: string;
  auctionId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  context?: ErrorContext;
}

/**
 * Standard error messages for common scenarios
 */
export const ErrorMessages = {
  // GraphQL Errors
  GRAPHQL_CONNECTION_ERROR: "Unable to connect to marketplace data. Retrying...",
  GRAPHQL_TIMEOUT: "Data request timed out. Please try again.",
  GRAPHQL_RATE_LIMIT: "Too many requests. Please wait a moment.",
  
  // Transaction Errors
  TRANSACTION_REJECTED: "Transaction was rejected. Please try again.",
  TRANSACTION_FAILED: "Transaction failed. Check your balance and try again.",
  TRANSACTION_TIMEOUT: "Transaction is taking longer than expected. Check explorer for status.",
  INSUFFICIENT_FUNDS: "Insufficient funds for this transaction.",
  
  // Wallet Errors
  WALLET_NOT_CONNECTED: "Please connect your wallet to continue.",
  WALLET_DISCONNECTED: "Wallet disconnected. Please reconnect.",
  
  // Auction Errors
  AUCTION_NOT_FOUND: "Auction not found. It may have ended or been cancelled.",
  AUCTION_EXPIRED: "This auction has ended.",
  BID_TOO_LOW: "Bid must be at least 2% higher than the current bid.",
  INVALID_BID_AMOUNT: "Please enter a valid bid amount.",
  
  // Network Errors
  NETWORK_ERROR: "Network connection issue. Please check your connection.",
  RPC_ERROR: "Blockchain connection issue. Retrying...",
  
  // Generic
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
  OPERATION_CANCELLED: "Operation was cancelled.",
} as const;

/**
 * Parse error messages from various sources (contracts, GraphQL, etc.)
 */
export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Contract error patterns
    if (message.includes("insufficient") || message.includes("balance")) {
      return ErrorMessages.INSUFFICIENT_FUNDS;
    }
    if (message.includes("rejected") || message.includes("user denied")) {
      return ErrorMessages.TRANSACTION_REJECTED;
    }
    if (message.includes("timeout") || message.includes("timed out")) {
      return ErrorMessages.TRANSACTION_TIMEOUT;
    }
    if (message.includes("auction not active") || message.includes("ended")) {
      return ErrorMessages.AUCTION_EXPIRED;
    }
    if (message.includes("bid too low") || message.includes("minimum bid")) {
      return ErrorMessages.BID_TOO_LOW;
    }
    if (message.includes("network") || message.includes("connection")) {
      return ErrorMessages.NETWORK_ERROR;
    }
    if (message.includes("rate limit") || message.includes("too many")) {
      return ErrorMessages.GRAPHQL_RATE_LIMIT;
    }
    
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return ErrorMessages.UNKNOWN_ERROR;
}

/**
 * Determine error severity based on error type
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes("insufficient") || message.includes("balance")) {
      return "warning";
    }
    if (message.includes("rejected") || message.includes("denied")) {
      return "info";
    }
    if (message.includes("timeout")) {
      return "warning";
    }
    if (message.includes("failed") || message.includes("error")) {
      return "error";
    }
  }
  
  return "error";
}

/**
 * Create a retry wrapper for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: unknown) => void;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(attempt + 1, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Validate bid amount
 */
export function validateBidAmount(
  amount: string,
  minBid: number,
  maxBid?: number
): { valid: boolean; error?: string } {
  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { valid: false, error: ErrorMessages.INVALID_BID_AMOUNT };
  }
  
  if (numericAmount < minBid) {
    return { 
      valid: false, 
      error: `Bid must be at least ${minBid.toFixed(2)} USDC` 
    };
  }
  
  if (maxBid !== undefined && numericAmount > maxBid) {
    return { 
      valid: false, 
      error: `Bid cannot exceed ${maxBid.toFixed(2)} USDC` 
    };
  }
  
  // Check for reasonable decimal places (max 6 for USDC)
  const decimalPlaces = amount.includes(".") 
    ? amount.split(".")[1].length 
    : 0;
  
  if (decimalPlaces > 6) {
    return { 
      valid: false, 
      error: "Bid amount cannot have more than 6 decimal places" 
    };
  }
  
  return { valid: true };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(
  json: string, 
  fallback: T,
  context?: string
): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error(`JSON parse error${context ? ` in ${context}` : ""}:`, error);
    return fallback;
  }
}

/**
 * Hook for consistent error handling with toast notifications
 */
export function useErrorHandler() {
  const toast = useToast();

  const handleError = (
    error: unknown,
    context?: ErrorContext,
    showToast: boolean = true
  ): ErrorResult => {
    const message = parseErrorMessage(error);
    const severity = getErrorSeverity(error);
    
    // Log to console with context
    console.error("Error occurred:", {
      message,
      severity,
      context,
      error,
    });
    
    // Show toast if enabled
    if (showToast) {
      const title = context?.action 
        ? `${context.action} Failed` 
        : "Error";
      
      switch (severity) {
        case "info":
          toast.info(title, message);
          break;
        case "warning":
          toast.warning(title, message);
          break;
        case "error":
        case "critical":
          toast.error(title, message);
          break;
      }
    }
    
    return {
      success: false,
      error: message,
      context,
    };
  };

  const handleSuccess = (
    message: string,
    description?: string
  ) => {
    toast.success(message, description);
  };

  return {
    handleError,
    handleSuccess,
    parseErrorMessage,
    getErrorSeverity,
  };
}

/**
 * Create a loading state manager
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function createLoadingState(
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  operation: () => Promise<void>
): LoadingState {
  const execute = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await operation();
    } catch (error) {
      setError(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Execute immediately
  execute();

  return {
    isLoading: true,
    error: null,
    retry: execute,
  };
}
