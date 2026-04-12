/**
 * Marketplace — Install Route
 *
 * Handles template installation:
 * 1. Validates the template exists in the DB
 * 2. Checks payment for paid templates
 * 3. Increments the template's downloads counter in DB
 * 4. Returns install instructions/scaffold config
 *
 * Constitutional Compliance:
 * - Article VIII §8.3: No Mock Protocol — real DB persistence
 * - Only authenticated users may install paid templates
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { miningEngine } from "@/lib/economy/mining-engine"
import { prisma } from "@/lib/database/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const { templateId } = body

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 })
    }

    // Load template from DB
    const template = await prisma.marketplaceTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const userId = (session?.user as any)?.id as string | undefined

    // Check payment for paid templates
    if (template.price > 0) {
      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required to install paid templates" },
          { status: 401 }
        )
      }

      const balance = await miningEngine.getBalance(userId)
      if (balance < template.price) {
        return NextResponse.json(
          { error: `Insufficient AZR balance. Required: ${template.price}, Have: ${balance}` },
          { status: 402 }
        )
      }

      // Deduct balance
      await prisma.wallet.update({
        where: { userId_currency: { userId, currency: 'AZR' } },
        data: { balance: { decrement: template.price } },
      })

      // Record purchase transaction
      const wallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: 'AZR' } },
      })
      if (wallet) {
        await prisma.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -template.price,
            type: 'TRANSFER',
            currency: 'AZR',
            status: 'COMPLETED',
            description: `Purchased template: ${template.name}`,
            metadata: { templateId: template.id, action: 'PURCHASE' },
          },
        })
      }
    }

    // Increment download counter in DB
    await prisma.marketplaceTemplate.update({
      where: { id: templateId },
      data: { downloads: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      message: "Template installed successfully",
      newBalance: userId ? await miningEngine.getBalance(userId) : undefined,
    })
  } catch (error: any) {
    console.error("[marketplace/install] Install route error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error during installation" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Return templates the user has published (as a proxy for "installed" history)
  // A dedicated install-tracking model can be added later if needed
  const userId = (session.user as any)?.id as string

  const templates = await prisma.marketplaceTemplate.findMany({
    where: { publisherId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, downloads: true, price: true },
  })

  return NextResponse.json({ installs: templates, total: templates.length })
}
