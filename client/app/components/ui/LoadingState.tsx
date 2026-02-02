"use client";

import React from "react";

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function LoadingState({
  message = "Loading...",
  subMessage,
  size = "md",
  fullScreen = false,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
    : "w-full h-full min-h-[200px]";

  return (
    <div
      className={`${containerClasses} flex flex-col items-center justify-center`}
    >
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-[rgb(50,255,52)]/20`}
        />
        {/* Spinning inner ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-t-[rgb(50,255,52)] border-r-transparent border-b-transparent border-l-transparent absolute top-0 left-0 animate-spin`}
          style={{ animationDuration: "1s" }}
        />
      </div>
      
      {message && (
        <p className="mt-4 text-sm font-orbitron text-[rgb(186,255,188)]/80 animate-pulse">
          {message}
        </p>
      )}
      
      {subMessage && (
        <p className="mt-2 text-xs font-orbitron text-[rgb(186,255,188)]/50">
          {subMessage}
        </p>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export function ErrorState({
  title = "Error",
  message,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
}: ErrorStateProps) {
  const isRetrying = retryCount > 0 && retryCount < maxRetries;

  return (
    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center p-6">
      {/* Error icon */}
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-base font-orbitron font-bold text-red-400 mb-2">
        {title}
      </h3>

      <p className="text-sm font-orbitron text-[rgb(186,255,188)]/70 text-center max-w-md mb-4">
        {message}
      </p>

      {isRetrying && (
        <p className="text-xs font-orbitron text-[rgb(186,255,188)]/50 mb-4">
          Retrying... (Attempt {retryCount} of {maxRetries})
        </p>
      )}

      {onRetry && !isRetrying && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)] font-orbitron text-xs uppercase tracking-[0.12em] hover:bg-[rgb(50,255,52)]/20 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
}

interface TransactionStateProps {
  status: "pending" | "success" | "error";
  message: string;
  subMessage?: string;
  txHash?: string;
  onClose?: () => void;
}

export function TransactionState({
  status,
  message,
  subMessage,
  txHash,
  onClose,
}: TransactionStateProps) {
  const statusConfig = {
    pending: {
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/40",
      textColor: "text-yellow-400",
      icon: (
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ),
    },
    success: {
      bgColor: "bg-[rgb(50,255,52)]/10",
      borderColor: "border-[rgb(50,255,52)]/40",
      textColor: "text-[rgb(50,255,52)]",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    error: {
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/40",
      textColor: "text-red-400",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} px-4 py-3 w-full`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${config.textColor}`}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-orbitron font-medium ${config.textColor}`}>
            {message}
          </p>
          {subMessage && (
            <p className="mt-1 text-xs font-orbitron text-[rgb(186,255,188)]/70">
              {subMessage}
            </p>
          )}
          {txHash && (
            <a
              href={`https://starkscan.co/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs font-orbitron text-[rgb(50,255,52)] hover:underline break-all flex items-center gap-1"
            >
              {txHash}
              <svg
                className="w-3 h-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
