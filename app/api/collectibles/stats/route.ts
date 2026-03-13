/**
 * Collectible Showcase — Stats Route
 *
 * Returns platform-wide collectible statistics:
 * total cards, minted count, total power distributed, tier breakdown, top achievements.
 */

import { NextResponse } from "next/server"

// Achievement definitions (mirrors achievements route)
const TIER_WEIGHTS: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 8,
  legendary: 16,
  mythical: 32,
}

export async function GET() {
  void TIER_WEIGHTS
  return NextResponse.json(
    {
      error: "Collectible stats aggregation backend is not configured",
      success: false,
      required: ["database aggregate queries", "minted-card index", "achievement unlock counters"],
    },
    { status: 503 }
  )
}
