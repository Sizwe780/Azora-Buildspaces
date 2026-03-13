import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || ''

export async function GET() {
  // Check if user is authenticated
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ 
      connected: false, 
      message: 'Sign in to enable Figma import' 
    })
  }

  // Check if FIGMA_TOKEN is configured
  if (!FIGMA_TOKEN) {
    return NextResponse.json({ 
      connected: false, 
      message: 'FIGMA_TOKEN not configured on server' 
    })
  }

  // Test the Figma API connection
  try {
    const resp = await fetch('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': FIGMA_TOKEN }
    })

    if (resp.ok) {
      const user = await resp.json()
      return NextResponse.json({ 
        connected: true, 
        message: `Connected as ${user.handle || user.email || 'Figma User'}`,
        user: {
          handle: user.handle,
          email: user.email,
          img_url: user.img_url
        }
      })
    } else {
      return NextResponse.json({ 
        connected: false, 
        message: 'Invalid Figma token or API error' 
      })
    }
  } catch (err) {
    return NextResponse.json({ 
      connected: false, 
      message: 'Could not reach Figma API' 
    })
  }
}
