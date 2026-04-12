import { test, expect } from '@playwright/test';

test.describe('Room smoke tests', () => {
  test('Code Chamber loads and editor is visible', async ({ page }) => {
    await page.goto('/features/code-chamber', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Code Chamber').first()).toBeVisible({ timeout: 20000 });
  });

  test('Spec Chamber loads and create spec works', async ({ page }) => {
    await page.goto('/features/spec-chamber', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Spec Chamber').first()).toBeVisible({ timeout: 20000 });
  });

  test('Collaboration Pod loads and video controls are visible', async ({ page }) => {
    await page.goto('/features/collaboration-pod', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Real-time Hub')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Multi-player Editing')).toBeVisible();
  });

  test('Knowledge Ocean loads and search bar is visible', async ({ page }) => {
    await page.goto('/features/knowledge-ocean', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=AI-Powered Knowledge Graph')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Semantic Search' })).toBeVisible();
  });
});
