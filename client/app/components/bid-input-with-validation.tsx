"use client";

import React, { useState, useCallback, useEffect } from "react";
import { formatUSD } from "../lib/utils";
import { validateBidAmount } from "../lib/utils/error-handling";

interface BidInputWithValidationProps {
  value: string;
  onChange: (value: string) => void;
  minBid: number;
  maxBid?: number;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  showMinBidHint?: boolean;
}

export function BidInputWithValidation({
  value,
  onChange,
  minBid,
  maxBid,
  disabled = false,
  placeholder = "Enter bid amount",
  label = "Bid Amount (USDC)",
  showMinBidHint = true,
}: BidInputWithValidationProps) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Validate on value change
  useEffect(() => {
    if (value) {
      const validation = validateBidAmount(value, minBid, maxBid);
      setError(validation.valid ? null : validation.error || "Invalid amount");
    } else {
      setError(null);
    }
  }, [value, minBid, maxBid]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Only allow numbers and one decimal point
    if (newValue && !/^\d*\.?\d*$/.test(newValue)) {
      return;
    }
    
    onChange(newValue);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const isValid = !error && value.length > 0;
  const showError = touched && error;

  return (
    <div className="w-full">
      <label className="block text-xs font-orbitron uppercase tracking-[0.12em] text-[rgb(186,255,188)]/70 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 rounded-lg bg-black/40 border font-orbitron text-sm
            transition-all duration-200 outline-none
            ${showError 
              ? "border-red-500/50 focus:border-red-500 text-red-300" 
              : isValid
                ? "border-[rgb(50,255,52)]/30 focus:border-[rgb(50,255,52)] text-white"
                : "border-white/10 focus:border-[rgb(50,255,52)]/50 text-white"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        />
        
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-orbitron text-[rgb(186,255,188)]/50">
          USDC
        </span>
      </div>

      {/* Validation messages */}
      <div className="mt-2 space-y-1">
        {showError && (
          <p className="text-xs font-orbitron text-red-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {showMinBidHint && !showError && (
          <p className="text-xs font-orbitron text-[rgb(186,255,188)]/50">
            Minimum bid: {formatUSD(minBid)}
          </p>
        )}
      </div>
    </div>
  );
}

interface BidValidationSummaryProps {
  bidAmount: string;
  minBid: number;
  userBalance: number;
  tokenSymbol?: string;
}

export function BidValidationSummary({
  bidAmount,
  minBid,
  userBalance,
  tokenSymbol = "USDC",
}: BidValidationSummaryProps) {
  const numericBid = parseFloat(bidAmount);
  
  if (isNaN(numericBid) || numericBid <= 0) {
    return null;
  }

  const isAboveMin = numericBid >= minBid;
  const hasBalance = userBalance >= numericBid;

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-orbitron text-[rgb(186,255,188)]/70">Minimum Required:</span>
        <span className={`font-orbitron ${isAboveMin ? "text-[rgb(50,255,52)]" : "text-red-400"}`}>
          {formatUSD(minBid)}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="font-orbitron text-[rgb(186,255,188)]/70">Your Bid:</span>
        <span className="font-orbitron text-white">{formatUSD(numericBid)}</span>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="font-orbitron text-[rgb(186,255,188)]/70">Your Balance:</span>
        <span className={`font-orbitron ${hasBalance ? "text-[rgb(50,255,52)]" : "text-red-400"}`}>
          {formatUSD(userBalance)} {tokenSymbol}
        </span>
      </div>

      {!hasBalance && (
        <p className="text-xs font-orbitron text-red-400 mt-2">
          Insufficient balance. You need {formatUSD(numericBid - userBalance)} more.
        </p>
      )}
    </div>
  );
}
