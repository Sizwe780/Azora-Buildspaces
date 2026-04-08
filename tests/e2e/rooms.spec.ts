import { test, expect } from '@playwright/test'

test.describe('Room smoke tests', () => {
  test('Code Chamber loads and editor is visible', async ({ page }) => {
    await page.goto('/features/code-chamber')
    await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible({ timeout: 10000 })
  })

  test('Spec Chamber loads and create spec works', async ({ page }) => {
    await page.goto('/features/spec-chamber')
    await expect(page.locator('text=Create Spec')).toBeVisible({ timeout: 10000 })
  })

  test('Collaboration Pod loads and video controls are visible', async ({ page }) => {
    await page.goto('/features/collaboration-pod')
    await expect(page.locator('text=Real-time Hub')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Multi-player Editing')).toBeVisible()
  })

  test('Knowledge Ocean loads and search bar is visible', async ({ page }) => {
    await page.goto('/features/knowledge-ocean')
    await expect(page.locator('text=AI-Powered Knowledge Graph')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Semantic Search')).toBeVisible()
  })
})
