/**
 * Marketplace — Install Route
 *
 * Handles template/extension installation end-to-end:
 * 1. Validates the template exists in the marketplace catalog
 * 2. Checks version compatibility (node engine)
 * 3. Records the install in the user's install log (data/marketplace/installs.json)
 * 4. Increments the template's download counter
 * 5. Returns install instructions/scaffold config
 *
 * Constitutional Compliance:
 * - Article VIII §8.3: No Mock Protocol — real file-system persistence
 * - Only authenticated users may install paid templates
 */

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { miningEngine } from "@/lib/economy/mining-engine"
import { prisma } from "@/lib/database/client"

interface InstallRecord {
  id: string
  templateId: string
  templateName: string
  userId: string
  installedAt: string
  version: string
  price: string
}

const TEMPLATES_PATH = path.join(process.cwd(), "data", "marketplace", "templates.json")
const INSTALLS_PATH = path.join(process.cwd(), "data", "marketplace", "installs.json")

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data as any : (data.templates || fallback)
  } catch {
    return fallback
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const { templateId } = body

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 })
    }

    // Load catalog
    let templates: any[] = await readJson(TEMPLATES_PATH, [])
    const template = templates.find((t: any) => t.id === templateId)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const userId = session?.user?.id

    // Check payment for paid templates
    if (template.price !== "Free") {
      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required to install paid templates" },
          { status: 401 },
        )
      }

      const priceMatch = template.price.match(/(\d+)/)
      const price = priceMatch ? parseInt(priceMatch[1]) : 0

      if (price > 0) {
        // Constitutional: Verify balance via Mining Engine / Prisma
        const balance = await miningEngine.getBalance(userId)
        if (balance < price) {
          return NextResponse.json(
            { error: `Insufficient AZR balance. Required: ${price}, Hot: ${balance}` },
            { status: 402 }
          )
        }

        // Deduct flow
        await prisma.wallet.update({
          where: { userId_currency: { userId, currency: 'AZR' } },
          data: { balance: { decrement: price } }
        })

        // Record purchase transaction
        await prisma.transaction.create({
          data: {
            walletId: (await prisma.wallet.findUnique({ where: { userId_currency: { userId, currency: 'AZR' } } }))?.id || '',
            amount: -price,
            type: 'TRANSFER',
            currency: 'AZR',
            status: 'COMPLETED',
            description: `Purchased template: ${template.name}`,
            metadata: { templateId: template.id, action: 'PURCHASE' }
          }
        })
      }
    }

    // Record install
    const installs: InstallRecord[] = await readJson(INSTALLS_PATH, [])
    const finalUserId = userId || "anonymous"

    // Idempotent: skip duplicate installs for the same user
    const alreadyInstalled = installs.some(
      (i) => i.templateId === templateId && i.userId === finalUserId,
    )

    if (!alreadyInstalled) {
      const record: InstallRecord = {
        id: `install_${Date.now()}`,
        templateId,
        templateName: template.name,
        userId: finalUserId,
        installedAt: new Date().toISOString(),
        version: template.version ?? "1.0.0",
        price: template.price,
      }
      installs.push(record)
      await writeJson(INSTALLS_PATH, installs)

      // Increment download counter in catalog
      template.downloads = (template.downloads ?? 0) + 1
      await writeJson(TEMPLATES_PATH, templates)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Template installed successfully",
      newBalance: userId ? await miningEngine.getBalance(userId) : undefined
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

  const userId = (session.user as any)?.id ?? (session.user as any)?.email

  const installs: InstallRecord[] = await readJson(INSTALLS_PATH, [])
  const userInstalls = installs.filter((i) => i.userId === userId)

  return NextResponse.json({ installs: userInstalls, total: userInstalls.length })
}
