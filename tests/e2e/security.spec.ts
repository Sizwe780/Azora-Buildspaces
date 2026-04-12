import { test, expect } from '@playwright/test'

test.describe('Security Headers e2e suite', () => {
  test('ensure critical security headers are set', async ({ request }) => {
    // Navigate to a valid root endpoint or login page to pull headers
    const response = await request.get('/')
    
    // Log the headers for easier debugging
    console.log(response.headers())

    expect(response.headers()['x-frame-options']).toBeDefined()
    expect(response.headers()['x-content-type-options']).toBeDefined()
    
    // Check for CSP definition
    const csp = response.headers()['content-security-policy']
    expect(csp).toBeDefined()
    
    // It should explicitly NOT contain unsafe-inline for scripts according to the SDLC
    if (csp) {
      // Check for proper restrictive CSP settings where possible
      expect(csp).not.toContain("script-src 'unsafe-inline';")
      expect(csp).not.toContain("style-src 'unsafe-inline';")
    }

    // Ensure Strict-Transport-Security is present
    expect(response.headers()['strict-transport-security']).toBeDefined()
  })

  test('ensure basic API auth endpoints return restrictive CORS/security headers', async ({ request }) => {
    const response = await request.post('/api/auth/session')
    
    // Some routes might not need all headers but critical ones should be present
    expect(response.headers()['x-content-type-options']).toEqual('nosniff')
  })
})