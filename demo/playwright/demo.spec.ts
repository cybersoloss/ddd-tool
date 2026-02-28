import { test, expect, type Page } from '@playwright/test';
import { renderTerminal } from './terminal';

/**
 * Demo walkthrough test for DDD Tool.
 * Navigates through the expense-scanner project capturing screenshots at each level.
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
    // --- 0. Intro card ---
    await page.setContent(renderTerminal({
      title: 'DDD Tool — Quick Walkthrough',
      lines: [
        '',
        '  {bold}Building an Agent as an Expense Scanner{/bold}',
        '',
        '  {dim}A quick walkthrough of a small, everyday example:{/dim}',
        '  {dim}designing and executing an AI agent with the DDD methodology.{/dim}',
        '',
        '  {dim}This is a deliberately brief overview showing how DDD Tool{/dim}',
        '  {dim}lets you visually design agent flows — from system-level{/dim}',
        '  {dim}domain mapping down to individual node specifications.{/dim}',
        '',
        '  {cyan}What you will see:{/cyan}',
        '    System map with 3 domains and cross-domain events',
        '    AI receipt scanning agent flow with guardrails',
        '    Agent loop with tools, human gate, and spec details',
        '    Smart approval routing with amount-based rules',
        '',
      ],
    }));
    await page.waitForTimeout(7000);
    await page.screenshot({ path: 'test-results/demo/00-intro.png' });

    // --- 1. Launcher ---
    await page.goto('/');
    await waitForBoot(page);
    await expect(page.getByText('expense-scanner', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/01-launcher.png' });

    // --- 2. Open project -> System Map (L1) ---
    await page.getByText('expense-scanner', { exact: true }).click();
    await expect(page.getByText('Expenses', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/02-system-map.png' });

    // --- 3. Navigate to Expenses domain (L2) ---
    await dblclickText(page, 'Receipt scanning and expense submission');
    await expect(page.getByText('Scan Receipt')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/03-expenses-domain.png' });

    // --- 4. Open scan-receipt flow (L3) ---
    await dblclickText(page, 'AI-powered receipt OCR with human review');
    await expect(page.getByText('Receipt Upload')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/04-scan-receipt-flow.png' });

    // --- 5. Click a node to show spec ---
    await page.getByText('Receipt Scanner').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/05-node-selected.png' });

    // --- 6. Navigate to Approvals domain ---
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await dblclickText(page, 'Review workflows and reimbursement');
    await expect(page.getByText('Review Expense')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/06-approvals-domain.png' });

    // --- 7. Open review-expense flow ---
    await dblclickText(page, 'Smart routing and approval by amount');
    await expect(page.getByText('Route by Amount')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/07-review-flow.png' });
  });
});
