/**
 * Collectible Showcase — Leaderboard Route
 *
 * Returns a ranked list of users by total collectible power.
 * Uses DB aggregation via prisma.collectible.groupBy().
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/client"

interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatar?: string
  totalPower: number
  cardsOwned: number
  topAchievement?: string
  badge?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 100)
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1)

  // Aggregate collectibles by owner
  const grouped = await prisma.collectible.groupBy({
    by: ["ownerId"],
    _sum: { power: true },
    _count: { id: true },
    where: { ownerId: { not: null } },
    orderBy: { _sum: { power: "desc" } },
    take: 50,
  })

  // Fetch user names for each ownerId
  const ownerIds = grouped.map((g) => g.ownerId as string)
  const users = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, image: true },
      })
    : []

  const userMap = new Map(users.map((u) => [u.id, u]))

  const ranked: LeaderboardEntry[] = grouped.map((g, index) => {
    const user = userMap.get(g.ownerId as string)
    return {
      rank: index + 1,
      userId: g.ownerId as string,
      displayName: user?.name ?? g.ownerId ?? "Unknown",
      avatar: user?.image ?? undefined,
      totalPower: g._sum.power ?? 0,
      cardsOwned: g._count.id,
    }
  })

  const start = (page - 1) * limit
  const paginated = ranked.slice(start, start + limit)

  const entries = paginated.map((e) => ({
    rank: e.rank,
    name: e.displayName,
    power: e.totalPower,
    badge: "⭐",
    userId: e.userId,
    cardsOwned: e.cardsOwned,
    avatar: e.avatar,
  }))

  return NextResponse.json({
    entries,
    leaderboard: paginated,
    total: ranked.length,
    page,
    limit,
  })
}
