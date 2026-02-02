/**
 * GraphQL-specific error handling with retry logic
 * Handles Torii/GraphQL endpoint failures gracefully
 */

import { ApolloError, ServerError, ServerParseError } from "@apollo/client";
import { withRetry, ErrorMessages, parseErrorMessage } from "./error-handling";

export interface GraphQLErrorInfo {
  message: string;
  code?: string;
  statusCode?: number;
  isNetworkError: boolean;
  isRetryable: boolean;
}

/**
 * Parse Apollo GraphQL errors into structured info
 */
export function parseGraphQLError(error: unknown): GraphQLErrorInfo {
  // Handle ApolloError
  if (error instanceof ApolloError) {
    // Network error
    if (error.networkError) {
      const networkError = error.networkError;
      
      // ServerError (HTTP status code)
      if ("statusCode" in networkError) {
        const serverError = networkError as ServerError;
        const statusCode = serverError.statusCode;
        
        return {
          message: ErrorMessages.GRAPHQL_CONNECTION_ERROR,
          statusCode,
          isNetworkError: true,
          isRetryable: statusCode >= 500 || statusCode === 429,
        };
      }
      
      // ServerParseError
      if ("bodyText" in networkError) {
        return {
          message: ErrorMessages.GRAPHQL_CONNECTION_ERROR,
          isNetworkError: true,
          isRetryable: true,
        };
      }
      
      // Generic network error
      return {
        message: ErrorMessages.NETWORK_ERROR,
        isNetworkError: true,
        isRetryable: true,
      };
    }
    
    // GraphQL errors (from the server)
    if (error.graphQLErrors?.length) {
      const firstError = error.graphQLErrors[0];
      const message = firstError.message || ErrorMessages.UNKNOWN_ERROR;
      const code = firstError.extensions?.code as string | undefined;
      
      return {
        message,
        code,
        isNetworkError: false,
        isRetryable: false, // GraphQL errors are usually not retryable
      };
    }
  }
  
  // Handle standard errors
  const message = parseErrorMessage(error);
  const isNetworkError = message.toLowerCase().includes("network") || 
                        message.toLowerCase().includes("connection") ||
                        message.toLowerCase().includes("fetch");
  
  return {
    message,
    isNetworkError,
    isRetryable: isNetworkError,
  };
}

/**
 * Determine if a GraphQL error is retryable
 */
export function isRetryableGraphQLError(error: unknown): boolean {
  const info = parseGraphQLError(error);
  return info.isRetryable;
}

/**
 * Retry configuration for GraphQL operations
 */
export const GraphQLRetryConfig = {
  maxRetries: 3,
  delayMs: 2000, // Start with 2 second delay
  backoffMultiplier: 2,
  maxDelayMs: 30000, // Max 30 seconds between retries
};

/**
 * Execute a GraphQL operation with automatic retry
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  onRetry?: (attempt: number, error: GraphQLErrorInfo) => void
): Promise<T> {
  return withRetry(
    operation,
    {
      ...GraphQLRetryConfig,
      shouldRetry: isRetryableGraphQLError,
      onRetry: onRetry 
        ? (attempt, error) => onRetry(attempt, parseGraphQLError(error))
        : undefined,
    }
  );
}

/**
 * Create a fallback data provider for when GraphQL fails
 */
export function createFallbackData<T>(
  primaryData: T | null | undefined,
  fallbackData: T,
  error: unknown | null
): { data: T; isFallback: boolean; error: GraphQLErrorInfo | null } {
  const hasError = error !== null && error !== undefined;
  const hasPrimaryData = primaryData !== null && primaryData !== undefined;
  
  if (hasPrimaryData && !hasError) {
    return {
      data: primaryData,
      isFallback: false,
      error: null,
    };
  }
  
  if (hasError) {
    return {
      data: fallbackData,
      isFallback: true,
      error: parseGraphQLError(error),
    };
  }
  
  return {
    data: fallbackData,
    isFallback: true,
    error: null,
  };
}

/**
 * Hook for managing GraphQL query state with error handling
 */
export interface GraphQLQueryState<T> {
  data: T | null;
  loading: boolean;
  error: GraphQLErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
  refetch: () => Promise<void>;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  multiplier: number,
  maxDelay: number
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * GraphQL error codes that indicate temporary issues
 */
export const RetryableErrorCodes = [
  "INTERNAL_SERVER_ERROR",
  "TIMEOUT",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
];

/**
 * Check if a GraphQL error code indicates a retryable error
 */
export function isRetryableErrorCode(code: string | undefined): boolean {
  if (!code) return false;
  return RetryableErrorCodes.includes(code);
}
