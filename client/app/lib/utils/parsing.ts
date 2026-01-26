/**
 * Centralized parsing utilities for handling hex/decimal string conversions.
 * These utilities handle the various formats that come from GraphQL and contract responses.
 */

/**
 * Parses a value that could be a hex string (0x...), decimal string, or number.
 * Returns NaN if the value cannot be parsed.
 *
 * @param value - The value to parse
 * @returns The parsed number, or NaN if unparseable
 */
export function parseHexOrDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return NaN;
  }

  if (typeof value === 'number') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return NaN;
  }

  // Check for hex prefix (case-insensitive)
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return parseInt(trimmed, 16);
  }

  // Try parsing as decimal
  return parseFloat(trimmed);
}

/**
 * Parses a status value from various formats into a number.
 * Handles decimal strings, hex strings (0x...), and raw numbers.
 * Returns -1 for invalid/missing values.
 *
 * @param status - The status value to parse
 * @returns The parsed status number, or -1 if invalid
 */
export function parseStatus(status: string | number | null | undefined): number {
  if (status === null || status === undefined) {
    return -1;
  }

  if (typeof status === 'number') {
    return status;
  }

  if (typeof status === 'string') {
    const trimmed = status.trim();
    if (!trimmed) {
      return -1;
    }

    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      const parsed = parseInt(trimmed, 16);
      return isNaN(parsed) ? -1 : parsed;
    }

    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? -1 : parsed;
  }

  return -1;
}

/**
 * Parses a timestamp value from hex or decimal string format.
 * Returns 0 for invalid/missing values.
 *
 * @param timestamp - The timestamp value to parse
 * @returns The parsed timestamp as a number (typically Unix seconds), or 0 if invalid
 */
export function parseTimestamp(timestamp: string | number | null | undefined): number {
  if (timestamp === null || timestamp === undefined) {
    return 0;
  }

  if (typeof timestamp === 'number') {
    return timestamp;
  }

  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (!trimmed) {
      return 0;
    }

    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      const parsed = parseInt(trimmed, 16);
      return isNaN(parsed) ? 0 : parsed;
    }

    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Parses a token amount from hex or decimal string format.
 * Optionally divides by a decimal factor (e.g., 1e6 for USDC, 1e18 for ETH).
 * Returns 0 for invalid/missing values.
 *
 * @param amount - The amount value to parse
 * @param decimals - Number of decimals to divide by (default: 0, no division)
 * @returns The parsed amount, optionally adjusted for decimals
 */
export function parseAmount(
  amount: string | number | null | undefined,
  decimals: number = 0
): number {
  if (amount === null || amount === undefined) {
    return 0;
  }

  let parsed: number;

  if (typeof amount === 'number') {
    parsed = amount;
  } else if (typeof amount === 'string') {
    const trimmed = amount.trim();
    if (!trimmed) {
      return 0;
    }

    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      parsed = parseInt(trimmed, 16);
    } else {
      parsed = parseFloat(trimmed);
    }
  } else {
    return 0;
  }

  if (isNaN(parsed)) {
    return 0;
  }

  // Apply decimal adjustment if specified
  if (decimals > 0) {
    return parsed / Math.pow(10, decimals);
  }

  return parsed;
}

/**
 * Parses a price value, handling hex/decimal formats and applying token decimals.
 * This is a convenience wrapper for common price parsing patterns.
 *
 * @param price - The price value to parse
 * @param tokenDecimals - The token's decimal places (e.g., 6 for USDC, 18 for ETH)
 * @returns The human-readable price value
 */
export function parsePrice(
  price: string | number | null | undefined,
  tokenDecimals: number
): number {
  return parseAmount(price, tokenDecimals);
}

/**
 * Safely parses an integer from various formats, with a default fallback.
 * Useful for parsing IDs, counts, and other integer values.
 *
 * @param value - The value to parse
 * @param defaultValue - The default value if parsing fails (default: 0)
 * @returns The parsed integer or the default value
 */
export function safeParseInt(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  const parsed = parseHexOrDecimal(value);
  return isNaN(parsed) ? defaultValue : Math.floor(parsed);
}
