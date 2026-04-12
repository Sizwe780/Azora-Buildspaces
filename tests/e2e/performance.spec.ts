import { test, expect } from '@playwright/test'

test.describe('Performance Metrics Suite', () => {
  test('HomePage loads and becomes interactive within budget', async ({ page }) => {
    
    // Begin performance measuring via the CDP or raw page timings
    // Using performance API built into browsers
    await page.goto('/')
    
    const performanceTimingJson = await page.evaluate(() => JSON.stringify(window.performance.timing))
    const performanceTiming = JSON.parse(performanceTimingJson)

    const interactiveTime = performanceTiming.domInteractive - performanceTiming.navigationStart
    const loadEventTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart
    
    console.log(`Interactive: ${interactiveTime}ms`)
    console.log(`Load Event: ${loadEventTime}ms`)
    
    // Set acceptable budgets
    expect(interactiveTime).toBeLessThan(3500)
    expect(loadEventTime).toBeLessThan(4500)

    // Using LCP specific check
    const lcp = await page.evaluate(`
      new Promise(resolve => {
        let lcp;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.renderTime || lastEntry.loadTime;
          // Resolve immediately for testing purposes instead of waiting indefinitely 
          resolve(lcp);
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Timeout strategy if LCP is small/doesn't exist
        setTimeout(() => resolve(undefined), 3000);
      });
    `);
    
    if (lcp) {
      console.log(`LCP Time: ${lcp}ms`)
      expect(lcp).toBeLessThan(3000)
    }

  })
})