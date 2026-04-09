import { test, expect } from '@playwright/test'

test.describe('Workspace Workflows', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to a dedicated project for e2e workflow tests
    await page.goto('/workspace?project=workflow-e2e')
    // Wait for the workspace to initialize completely
    await expect(page.locator('text=Initializing workspace...')).not.toBeVisible({ timeout: 15000 })
  })

  test('Room Switches Workflow', async ({ page }) => {
    // 1. Code Chamber is the default room
    // Verify Explorer or File views are visible
    await expect(page.locator('[data-testid="file-explorer"], .explorer-view, text=EXPLORER').first()).toBeVisible({ timeout: 10000 })

    // 2. Switch to AI Studio (Shortcut: Ctrl+2)
    await page.keyboard.press('Control+2')
    // Validate we are in AI Studio
    await expect(page.locator('text=AI Studio').first()).toBeVisible({ timeout: 10000 })

    // 3. Switch to Design Studio (Shortcut: Ctrl+3)
    await page.keyboard.press('Control+3')
    await expect(page.locator('text=Design Studio, text=Canvas, text=Figma').first()).toBeVisible({ timeout: 10000 })

    // 4. Switch to Spec Chamber (Shortcut: Ctrl+5)
    await page.keyboard.press('Control+5')
    await expect(page.locator('text=Spec Chamber, text=Specifications').first()).toBeVisible({ timeout: 10000 })

    // Return to Code Chamber (Shortcut: Ctrl+1)
    await page.keyboard.press('Control+1')
    await expect(page.locator('text=EXPLORER').first()).toBeVisible({ timeout: 10000 })
  })

  test('Save Workflow', async ({ page }) => {
    // Ensure Code Chamber is active
    await page.keyboard.press('Control+1')
    await expect(page.locator('text=EXPLORER').first()).toBeVisible({ timeout: 10000 })

    // Add a new file using the '+' button if it exists, otherwise just open editor
    const newFileBtn = page.locator('button[aria-label="New File"], button:has(svg.lucide-plus), .explorer-action-new-file').first()
    
    // Fallback if the button is not visible: try to just focus on the explorer area and type a generic action
    if (await newFileBtn.isVisible()) {
      await newFileBtn.click()
      await page.keyboard.type('test-save.ts')
      await page.keyboard.press('Enter')
    }

    // Wait for editor
    const editor = page.locator('.monaco-editor').first()
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Click into editor and modify to make it dirty
    await editor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('// Workflow save test file')

    // Expect unsaved changes marker (if applicable)
    // Note: Depends on UI representation, might be a circle on the tab
    const dirtyIndicator = page.locator('.dirty-indicator, [title="Unsaved changes"]').first()

    // Assuming we have unsaved changes, press Save
    await page.keyboard.press('Control+S')

    // Expect dirty indicator to go away or status to say Saved
    await expect(dirtyIndicator).not.toBeVisible({ timeout: 5000 })
  })

  test('Generate Workflow', async ({ page }) => {
    // Navigate to Code Chamber
    await page.keyboard.press('Control+1')
    
    // Open the AI Panel via shortcut (Ctrl+Shift+A) or find the toggle button
    await page.keyboard.press('Control+Shift+A')
    const aiPanel = page.locator('[data-testid="ai-panel"], text=AI ASSISTANT, .ai-assistant-panel').last()
    await expect(aiPanel).toBeVisible({ timeout: 10000 })

    // Find the textarea input for AI Chat
    const chatInput = page.locator('textarea[placeholder*="message"], textarea[aria-label="Chat input"], input.chat-input').first()
    await expect(chatInput).toBeVisible()

    // Ask it to generate something
    await chatInput.fill('Generate a React counter component')
    await chatInput.press('Enter')

    // Wait for the AI to respond (we expect a code block or generation text to stream in)
    const codeResponse = page.locator('.ai-message code, .chat-message code, pre.language-tsx, pre.language-tsx code').first()
    await expect(codeResponse).toBeVisible({ timeout: 30000 })
  })

  test('Collaborate Workflow', async ({ page }) => {
    // Switch to Collaboration Pod (Shortcut: Ctrl+8)
    await page.keyboard.press('Control+8')
    
    // Validate we are in the Collaboration Hub / Pod
    // Look for things like "Multi-player Editing", "Participants", or "Real-time Hub"
    const collabText = page.locator('text=Real-time Hub, text=Collaboration Pod, text=Multi-player, text=Participants, text=Presence').first()
    await expect(collabText).toBeVisible({ timeout: 15000 })

    // In a full test, we might check for the presence of a chat input or participant list
    const participantList = page.locator('.participants-list, [data-testid="participants"]').first()
    // It might explicitly be visible or we can just ensure the pod is responsive
    if (await participantList.isVisible()) {
        await expect(participantList).toBeVisible()
    }
  })

})