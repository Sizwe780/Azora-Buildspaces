import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      // Development fallback: just log to console if no API key is provided
      console.log('--- NEW CONTACT SUBMISSION (Fallback Mode) ---')
      console.log(`From: ${name} <${email}>`)
      console.log(`Subject: ${subject}`)
      console.log(`Message: ${message}`)
      console.log('----------------------------------------------')
      
      return NextResponse.json({ success: true, message: 'Message recorded locally' })
    }

    // Call Resend to actually send an email if API key is present
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Contact Form <onboarding@resend.dev>', // Should be a verified domain in production
        to: ['hello@azora.dev'], // Forward it to your support email
        subject: `New Contact Request: ${subject}`,
        html: `
          <h3>New message from ${name} (${email})</h3>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p>${message.replace(/\n/g, '<br />')}</p>
        `
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via provider')
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully' })
  } catch (error: any) {
    console.error('Contact Form Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process your request' },
      { status: 500 }
    )
  }
}