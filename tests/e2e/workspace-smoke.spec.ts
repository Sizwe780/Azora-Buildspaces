import { test, expect } from '@playwright/test'

/**
 * Workspace Smoke Tests
 * 
 * Validates core workspace stability:
 * 1. Room navigation and persistence
 * 2. Code Chamber loading and file interaction
 */
test.describe('Workspace Stability', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to workspace with a default project
    await page.goto('/workspace?project=smoke-test')
    // Wait for the workspace to initialize
    await expect(page.locator('text=Initializing workspace...')).not.toBeVisible({ timeout: 15000 })
  })

  test('should load Code Chamber by default and switch rooms', async ({ page }) => {
    // Check if Code Chamber is active (logo or specific element)
    // Code Chamber renders WorkbenchLayout with a file explorer
    await expect(page.locator('[data-testid="file-explorer"], .explorer-view, text=EXPLORER')).toBeVisible({ timeout: 10000 })

    // Navigate to AI Studio using RoomSelector (shortcuts or click)
    // Shortcuts: Ctrl+2 for AI Studio
    await page.keyboard.press('Control+2')
    
    // Check if AI Studio loaded (mock or real)
    // We expect the URL or some text to change
    await expect(page.locator('text=AI Studio')).toBeVisible({ timeout: 5000 })

    // Refresh and check persistence
    await page.reload()
    await expect(page.locator('text=AI Studio')).toBeVisible({ timeout: 10000 })
  })

  test('should open, edit, and save a file in Code Chamber', async ({ page }) => {
    // Ensure we are in Code Chamber
    await page.keyboard.press('Control+1')
    
    // Create a new file (Ctrl+Alt+N or click plus)
    // For smoke test, let's just click an existing file if possible or use the '+' button
    const plusButton = page.locator('button:has(svg.lucide-plus), [aria-label="New File"]')
    if (await plusButton.isVisible()) {
        await plusButton.click()
        await page.keyboard.type('smoke-test.txt')
        await page.keyboard.press('Enter')
    }

    // Wait for editor to be visible
    const monaco = page.locator('.monaco-editor')
    await expect(monaco).toBeVisible()

    // Type in editor
    await monaco.click()
    await page.keyboard.type('Hello from smoke test!')

    // Save with Ctrl+S
    await page.keyboard.press('Control+s')

    // Check for "Saved" indicator in status bar or console
    // In EditorPanel, it logs "Saved <path>"
    // We can also check the dirty indicator (circle) disappears
    const dirtyIndicator = page.locator('[title="Unsaved changes"]')
    await expect(dirtyIndicator).not.toBeVisible()
  })

  test('should toggle workspace panels', async ({ page }) => {
    // Toggle terminal (Ctrl+`)
    await page.keyboard.press('Control+Tick') // Playwright 'Tick' is '`'
    const terminal = page.locator('text=TERMINAL, [data-testid="terminal-panel"]')
    await expect(terminal).toBeVisible()

    // Toggle AI panel (Ctrl+Shift+A)
    await page.keyboard.press('Control+Shift+a')
    const aiPanel = page.locator('text=AI ASSISTANT, [data-testid="ai-panel"]')
    await expect(aiPanel).toBeVisible()
  })
})
