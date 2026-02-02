/**
 * Comprehensive validation utilities for forms and inputs
 */

import { ErrorMessages } from "./error-handling";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Ethereum/Starknet address
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim() === "") {
    return { valid: false, error: "Address is required" };
  }

  // Starknet addresses are 0x followed by 64 hex characters
  const starknetRegex = /^0x[0-9a-fA-F]{64}$/;
  // Ethereum addresses are 0x followed by 40 hex characters
  const ethereumRegex = /^0x[0-9a-fA-F]{40}$/;

  if (starknetRegex.test(address) || ethereumRegex.test(address)) {
    return { valid: true };
  }

  return { valid: false, error: "Invalid address format" };
}

/**
 * Validate token amount
 */
export function validateTokenAmount(
  amount: string,
  minAmount?: number,
  maxAmount?: number,
  decimals: number = 6
): ValidationResult {
  if (!amount || amount.trim() === "") {
    return { valid: false, error: "Amount is required" };
  }

  // Check for valid number format
  if (!/^\d*\.?\d*$/.test(amount)) {
    return { valid: false, error: "Invalid number format" };
  }

  const numericValue = parseFloat(amount);

  if (isNaN(numericValue)) {
    return { valid: false, error: "Invalid amount" };
  }

  if (numericValue <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  // Check decimal places
  const decimalPlaces = amount.includes(".")
    ? amount.split(".")[1].length
    : 0;

  if (decimalPlaces > decimals) {
    return {
      valid: false,
      error: `Amount cannot have more than ${decimals} decimal places`,
    };
  }

  if (minAmount !== undefined && numericValue < minAmount) {
    return {
      valid: false,
      error: `Amount must be at least ${minAmount}`,
    };
  }

  if (maxAmount !== undefined && numericValue > maxAmount) {
    return {
      valid: false,
      error: `Amount cannot exceed ${maxAmount}`,
    };
  }

  return { valid: true };
}

/**
 * Validate auction duration (in minutes)
 */
export function validateAuctionDuration(
  durationMinutes: number,
  minDuration: number = 30,
  maxDuration: number = 10080 // 1 week
): ValidationResult {
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return { valid: false, error: "Duration is required" };
  }

  if (durationMinutes < minDuration) {
    return {
      valid: false,
      error: `Duration must be at least ${minDuration} minutes`,
    };
  }

  if (durationMinutes > maxDuration) {
    return {
      valid: false,
      error: `Duration cannot exceed ${maxDuration} minutes (1 week)`,
    };
  }

  return { valid: true };
}

/**
 * Validate auction name/title
 */
export function validateAuctionName(name: string): ValidationResult {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Auction name is required" };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 3) {
    return {
      valid: false,
      error: "Auction name must be at least 3 characters",
    };
  }

  if (trimmedName.length > 100) {
    return {
      valid: false,
      error: "Auction name cannot exceed 100 characters",
    };
  }

  return { valid: true };
}

/**
 * Validate NFT selection for auction
 */
export function validateNFTSelection(
  selectedNFTs: string[],
  minCount: number = 1,
  maxCount: number = 163
): ValidationResult {
  if (!selectedNFTs || selectedNFTs.length === 0) {
    return { valid: false, error: "At least one NFT must be selected" };
  }

  if (selectedNFTs.length < minCount) {
    return {
      valid: false,
      error: `At least ${minCount} NFT(s) must be selected`,
    };
  }

  if (selectedNFTs.length > maxCount) {
    return {
      valid: false,
      error: `Cannot select more than ${maxCount} NFTs`,
    };
  }

  return { valid: true };
}

/**
 * Validate starting price for auction
 */
export function validateStartingPrice(
  price: string,
  minPrice: number = 0.01
): ValidationResult {
  if (!price || price.trim() === "") {
    return { valid: false, error: "Starting price is required" };
  }

  const result = validateTokenAmount(price, minPrice);

  if (!result.valid) {
    return {
      valid: false,
      error: result.error || "Invalid starting price",
    };
  }

  return { valid: true };
}

/**
 * Validate reserve price (must be >= starting price if set)
 */
export function validateReservePrice(
  reservePrice: string,
  startingPrice: string
): ValidationResult {
  // Reserve price is optional
  if (!reservePrice || reservePrice.trim() === "") {
    return { valid: true };
  }

  const reserveResult = validateTokenAmount(reservePrice);
  if (!reserveResult.valid) {
    return {
      valid: false,
      error: "Invalid reserve price",
    };
  }

  const startResult = validateTokenAmount(startingPrice);
  if (!startResult.valid) {
    return { valid: true }; // Starting price validation will catch this
  }

  const reserveValue = parseFloat(reservePrice);
  const startValue = parseFloat(startingPrice);

  if (reserveValue < startValue) {
    return {
      valid: false,
      error: "Reserve price cannot be less than starting price",
    };
  }

  return { valid: true };
}

/**
 * Validate instant buy price (must be > starting price if set)
 */
export function validateInstantBuyPrice(
  instantBuyPrice: string,
  startingPrice: string
): ValidationResult {
  // Instant buy is optional
  if (!instantBuyPrice || instantBuyPrice.trim() === "") {
    return { valid: true };
  }

  const instantResult = validateTokenAmount(instantBuyPrice);
  if (!instantResult.valid) {
    return {
      valid: false,
      error: "Invalid instant buy price",
    };
  }

  const startResult = validateTokenAmount(startingPrice);
  if (!startResult.valid) {
    return { valid: true };
  }

  const instantValue = parseFloat(instantBuyPrice);
  const startValue = parseFloat(startingPrice);

  if (instantValue <= startValue) {
    return {
      valid: false,
      error: "Instant buy price must be greater than starting price",
    };
  }

  return { valid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === "") {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

/**
 * Validate username/handle
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || username.trim() === "") {
    return { valid: false, error: "Username is required" };
  }

  const trimmedUsername = username.trim();

  // Allow alphanumeric, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  if (!usernameRegex.test(trimmedUsername)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }

  if (trimmedUsername.length < 3) {
    return {
      valid: false,
      error: "Username must be at least 3 characters",
    };
  }

  if (trimmedUsername.length > 30) {
    return {
      valid: false,
      error: "Username cannot exceed 30 characters",
    };
  }

  return { valid: true };
}

/**
 * Validate URL
 */
export function validateURL(url: string): ValidationResult {
  if (!url || url.trim() === "") {
    return { valid: false, error: "URL is required" };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Create a composed validator that runs multiple validations
 */
export function composeValidators(
  ...validators: Array<() => ValidationResult>
): ValidationResult {
  for (const validator of validators) {
    const result = validator();
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * Hook for form validation
 */
export function useFormValidation<T extends Record<string, string>>(
  values: T,
  validators: {
    [K in keyof T]?: (value: string) => ValidationResult;
  }
) {
  const validateField = (fieldName: keyof T): ValidationResult => {
    const validator = validators[fieldName];
    if (!validator) {
      return { valid: true };
    }
    return validator(values[fieldName]);
  };

  const validateAll = (): { valid: boolean; errors: Partial<Record<keyof T, string>> } => {
    const errors: Partial<Record<keyof T, string>> = {};
    let valid = true;

    for (const fieldName in validators) {
      const result = validateField(fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        valid = false;
      }
    }

    return { valid, errors };
  };

  return { validateField, validateAll };
}
