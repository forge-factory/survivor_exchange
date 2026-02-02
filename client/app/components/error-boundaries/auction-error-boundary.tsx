"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorState } from "../ui";

interface AuctionErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AuctionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for auction-related components
 * Provides graceful degradation when auction data or interactions fail
 */
export class AuctionErrorBoundary extends Component<
  AuctionErrorBoundaryProps,
  AuctionErrorBoundaryState
> {
  constructor(props: AuctionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): AuctionErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("AuctionErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    // Log to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service
      // errorTracker.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="w-full p-6">
          <ErrorState
            title="Auction Section Error"
            message={
              this.state.error?.message ||
              "Something went wrong loading the auctions. Please try again."
            }
            onRetry={this.handleRetry}
          />

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <details className="mt-4 p-4 bg-black/40 rounded-lg border border-white/10">
              <summary className="text-xs font-orbitron text-[rgb(186,255,188)]/50 cursor-pointer">
                Debug Information
              </summary>
              <pre className="mt-2 text-xs text-[rgb(186,255,188)]/30 overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for individual auction cards
 */
export class AuctionCardErrorBoundary extends Component<
  AuctionErrorBoundaryProps,
  AuctionErrorBoundaryState
> {
  constructor(props: AuctionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): AuctionErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("AuctionCardErrorBoundary caught an error:", error);
    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-orbitron">Failed to load auction</span>
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-2 text-xs font-orbitron text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary for bid actions (place bid, make offer, etc.)
 */
export class BidActionErrorBoundary extends Component<
  AuctionErrorBoundaryProps,
  AuctionErrorBoundaryState
> {
  constructor(props: AuctionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): AuctionErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("BidActionErrorBoundary caught an error:", error);
    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
          <p className="text-xs font-orbitron text-red-400 mb-2">
            Bid action failed to load
          </p>
          <button
            onClick={this.handleRetry}
            className="text-xs font-orbitron text-[rgb(50,255,52)] hover:underline"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
