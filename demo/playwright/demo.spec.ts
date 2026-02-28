import { test, expect, type Page } from '@playwright/test';

/**
 * Demo walkthrough test for DDD Tool.
 * Navigates through the sample project capturing screenshots at each level.
 *
 * Navigation strategy:
 * - Domain blocks: double-click on domain description text
 * - Flow blocks: double-click on flow description text via coordinates
 * - Both avoid the name span which has stopPropagation and triggers rename
 * - Keyboard Escape goes up one level
 */

async function waitForBoot(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('#root');
    return el && !el.textContent?.includes('Loading...');
  }, { timeout: 10_000 });
}

/** Double-click on a text element using explicit mouse coordinates (more reliable with CSS transforms) */
async function dblclickText(page: Page, text: string) {
  const el = page.getByText(text).first();
  await el.waitFor({ state: 'visible', timeout: 5_000 });
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  }
}

test.describe('DDD Tool Demo Walkthrough', () => {

  test('full navigation demo', async ({ page }) => {
    // --- 1. Launcher ---
    await page.goto('/');
    await waitForBoot(page);
    await expect(page.getByText('ddd-sample-project', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/demo/01-launcher.png' });

    // --- 2. Open project -> System Map (L1) ---
    await page.getByText('ddd-sample-project', { exact: true }).click();
    await expect(page.getByText('Users')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/demo/02-system-map.png' });

    // --- 3. Navigate to Users domain (L2) ---
    await dblclickText(page, 'User management and authentication');
    await expect(page.getByText('User Register')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/demo/03-users-domain.png' });

    // --- 4. Open user-register flow (L3) ---
    await dblclickText(page, 'Validate and create new user accounts');
    await expect(page.getByText('Registration Request')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/demo/04-user-register-flow.png' });

    // --- 5. Click a node to show spec ---
    await page.getByText('Check Existing').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/demo/05-node-selected.png' });

    // --- 6. Navigate to Support domain ---
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await dblclickText(page, 'Customer support and ticketing');
    await expect(page.getByText('Support Ticket')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/demo/06-support-domain.png' });

    // --- 7. Open agent flow ---
    await dblclickText(page, 'AI-powered ticket resolution with human review');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/demo/07-agent-flow.png' });
  });
});
