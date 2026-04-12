import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { provider, apiKey, url } = await req.json()
    
    if (provider === 'azora-pilot') {
      const targetUrl = url || 'http://localhost:8000'
      try {
        const res = await fetch(`${targetUrl}/health`, { method: 'GET' })
        if (res.ok) {
          return NextResponse.json({ success: true, data: { status: 'success', message: 'Azora Pilot is online' } })
        } else {
          return NextResponse.json({ success: false, error: 'Azora Pilot returned error from /health' })
        }
      } catch(e) {
        return NextResponse.json({ success: false, error: 'Cannot connect to Azora Pilot' })
      }
    }
    
    if (!apiKey) return NextResponse.json({ success: false, error: 'API key required' })

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      if (res.ok) return NextResponse.json({ success: true, data: { status: 'success', message: 'Valid OpenAI Key' } })
      return NextResponse.json({ success: false, error: 'Invalid OpenAI Key' })
    }

    if (provider === 'anthropic' || provider === 'anthropic-claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'test' }] })
      })
      if (res.status !== 401 && res.status !== 403) {
        return NextResponse.json({ success: true, data: { status: 'success', message: 'Valid Anthropic Key' } })
      }
      return NextResponse.json({ success: false, error: 'Invalid Anthropic Key' })
    }

    if (provider === 'gemini' || provider === 'google-gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (res.ok) return NextResponse.json({ success: true, data: { status: 'success', message: 'Valid Gemini Key' } })
      return NextResponse.json({ success: false, error: 'Invalid Gemini Key' })
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      if (res.ok) return NextResponse.json({ success: true, data: { status: 'success', message: 'Valid Groq Key' } })
      return NextResponse.json({ success: false, error: 'Invalid Groq Key' })
    }

    return NextResponse.json({ success: false, error: `Unsupported provider: ${provider}` }, { status: 400 })
  } catch(error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to test API key' }, { status: 500 })
  }
}