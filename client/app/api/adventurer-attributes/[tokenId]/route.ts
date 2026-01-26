import { NextRequest, NextResponse } from 'next/server';

const TORII_SQL_ENDPOINT = 'https://api.cartridge.gg/x/pg-mainnet-10/torii/sql';
const ADVENTURER_CONTRACT = '0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd';

// In-memory cache for attributes
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;

  if (!tokenId) {
    return NextResponse.json({ error: 'Token ID required' }, { status: 400 });
  }

  try {
    // Check cache first
    const cached = cache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        tokenId,
        attributes: cached.data,
        cached: true,
      });
    }

    // Construct the full token_id format used in Torii: contract_address:0x{64-char hex}
    // The token ID needs to be padded to 64 hex characters
    const tokenIdHex = BigInt(tokenId).toString(16).padStart(64, '0');
    const fullTokenId = `${ADVENTURER_CONTRACT}:0x${tokenIdHex}`;

    // Fetch attributes from Torii SQL
    const attributesQuery = `SELECT trait_name, trait_value FROM token_attributes WHERE token_id = '${fullTokenId}'`;

    const attributesResponse = await fetch(
      `${TORII_SQL_ENDPOINT}?query=${encodeURIComponent(attributesQuery)}`
    );

    if (!attributesResponse.ok) {
      throw new Error(`Attributes fetch failed: ${attributesResponse.status}`);
    }

    const rawAttributes = await attributesResponse.json();

    // Transform to standard format
    const attributes = rawAttributes.map((attr: { trait_name: string; trait_value: string }) => ({
      trait_type: attr.trait_name,
      value: attr.trait_value,
    }));

    // Cache the result
    cache.set(tokenId, { data: attributes, timestamp: Date.now() });

    return NextResponse.json({
      tokenId,
      attributes,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching adventurer attributes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
