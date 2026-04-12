import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { web3Tooling } from '@/lib/services/web3-tooling'

// Actions that require authentication (access user-specific or sensitive data)
const AUTH_REQUIRED_ACTIONS = new Set(['contracts', 'wallet', 'local-node'])

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'chains'

  if (AUTH_REQUIRED_ACTIONS.has(action)) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
  }

  switch (action) {
    case 'chains':
      return NextResponse.json({ chains: web3Tooling.getChains() })
    case 'testnets':
      return NextResponse.json({ testnets: web3Tooling.getTestnets() })
    case 'contracts': {
      const chainId = searchParams.get('chainId')
      return NextResponse.json({ contracts: web3Tooling.getDeployedContracts(chainId ? parseInt(chainId) : undefined) })
    }
    case 'wallet':
      return NextResponse.json({ wallet: web3Tooling.getWalletState() })
    case 'local-node':
      return NextResponse.json({ running: web3Tooling.isLocalNodeRunning() })
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'compile': {
        const { source, filename } = body
        const result = await web3Tooling.compileSolidity(source, filename)
        return NextResponse.json({ result })
      }
      case 'deploy': {
        const { compiledContract, chainId, constructorArgs } = body
        const contract = await web3Tooling.deployContract(compiledContract, chainId, constructorArgs || [])
        return NextResponse.json({ contract })
      }
      case 'start-node': {
        const node = await web3Tooling.startLocalNode()
        return NextResponse.json({ node })
      }
      case 'stop-node': {
        await web3Tooling.stopLocalNode()
        return NextResponse.json({ success: true })
      }
      case 'estimate-gas': {
        const { chainId } = body
        const gas = await web3Tooling.estimateGas(chainId)
        return NextResponse.json({ gas })
      }
      case 'connect-wallet': {
        const { address, chainId, provider } = body
        web3Tooling.connectWallet(address, chainId, provider)
        return NextResponse.json({ wallet: web3Tooling.getWalletState() })
      }
      case 'disconnect-wallet': {
        web3Tooling.disconnectWallet()
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
