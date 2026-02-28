import { test, expect, type Page } from '@playwright/test';
import { renderTerminal } from './terminal';

/**
 * DDD Tool Feature Preview — Vantage Supply Chain Platform
 *
 * ~18 scenes showcasing ddd-tool's interactive capabilities
 * using a production-scale enterprise project with 9 domains,
 * 53 flows, and 28 node types.
 *
 * Unlike the lifecycle demo (which shows the DDD methodology),
 * this video showcases what ddd-tool can do — interactive editing,
 * search, validation, node placement, and navigation at scale.
 */

async function waitForBoot(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('#root');
    return el && !el.textContent?.includes('Loading...');
  }, { timeout: 15_000 });
}

async function dblclickText(page: Page, text: string) {
  const el = page.getByText(text).first();
  await el.waitFor({ state: 'visible', timeout: 5_000 });
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function terminalScene(page: Page, lines: string[], title: string, filename: string) {
  await page.setContent(renderTerminal({ lines, title }));
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `test-results/demo/${filename}` });
}

test.describe('DDD Tool Feature Preview — Vantage', () => {

  test('full feature preview — enterprise scale', async ({ page }) => {

    // ════════════════════════════════════════════════════════════════
    // SCENE 1: Title Card
    // ════════════════════════════════════════════════════════════════

    await page.setContent(renderTerminal({
      title: 'DDD Tool — Feature Preview',
      lines: [
        '',
        '  {bold}Vantage: AI-Powered Supply Chain Intelligence Platform{/bold}',
        '',
        '  {dim}A comprehensive feature preview of DDD Tool{/dim}',
        '  {dim}using a production-scale enterprise project{/dim}',
        '  {dim}with 9 domains, 53 flows, and 28 node types.{/dim}',
        '',
        '  {cyan}Features shown:{/cyan}',
        '    Search              Cmd+K palette across domains, flows, nodes',
        '    Interactive Canvas  Node selection, spec inspection, validation',
        '    Auto Layout         Automatic node arrangement with undo',
        '    Node Placement      Add nodes via toolbar',
        '    Orchestration       AI agent orchestrator with supervisor strategy',
        '    Specs Sidebar       Schema and data model browser',
        '    Lock Mode           Prevent accidental edits',
        '',
      ],
    }));
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'test-results/demo/fp-01-title.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 2: Launcher
    // ════════════════════════════════════════════════════════════════

    await page.goto('/');
    await waitForBoot(page);
    await expect(page.getByText('vantage', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-02-launcher.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 3: System Map — 9 domains with event arrows
    // ════════════════════════════════════════════════════════════════

    await page.getByText('vantage', { exact: true }).click();
    await expect(page.getByText('Suppliers', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-03-system-map.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 4: Search — Cmd+K, type "risk"
    // ════════════════════════════════════════════════════════════════

    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 3_000 });
    await searchInput.fill('risk');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/demo/fp-04-search.png' });

    // Navigate to score-supplier-risk via search
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // ════════════════════════════════════════════════════════════════
    // SCENE 5: score-supplier-risk flow
    // ════════════════════════════════════════════════════════════════

    await expect(page.getByText('LLM Risk Analysis')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-05-risk-flow.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 6: LLM node selected — spec panel
    // ════════════════════════════════════════════════════════════════

    await page.getByText('LLM Risk Analysis').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-06-llm-node.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 7: Data Store node selected — spec panel
    // ════════════════════════════════════════════════════════════════

    await page.getByText('Read Supplier').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-07-datastore-node.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 8: Validation panel
    // ════════════════════════════════════════════════════════════════

    // Deselect node by clicking canvas background (Escape would navigate up)
    // Click far right to avoid the node toolbar on the left
    const canvas = page.locator('.react-flow__pane');
    await canvas.click({ position: { x: 800, y: 400 } });
    await page.waitForTimeout(300);
    // Open validation panel
    await page.getByText('Validate').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/demo/fp-08-validation.png' });
    // Close validation panel by toggling the button (Escape would navigate up)
    await page.getByText('Validate').first().click();
    await page.waitForTimeout(300);

    // ════════════════════════════════════════════════════════════════
    // SCENE 9: Auto Layout
    // ════════════════════════════════════════════════════════════════

    await page.getByText('Auto Layout').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/demo/fp-09-auto-layout.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 10: Undo auto-layout
    // ════════════════════════════════════════════════════════════════

    await page.keyboard.press('Meta+z');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/demo/fp-10-undo.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 11: Add a node via toolbar
    // ════════════════════════════════════════════════════════════════

    // Click "Process" node type in the toolbar
    await page.getByText('Process', { exact: true }).first().click();
    await page.waitForTimeout(500);
    // Click on an empty area of the canvas to place the node (avoid toolbar on left)
    await canvas.click({ position: { x: 700, y: 400 } });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/demo/fp-11-add-node.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 12: Suppliers domain — escape back to see 7 flows
    // ════════════════════════════════════════════════════════════════

    // Navigate up: flow → domain (one Escape)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page.getByText('Score Supplier Risk').first()).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-12-suppliers-domain.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 13: Navigate to Logistics domain
    // ════════════════════════════════════════════════════════════════

    // Navigate up: domain → system (one Escape)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await dblclickText(page, 'Shipment lifecycle, carrier integrations, orchestrated fulfillment');
    await expect(page.getByText('Process Fulfillment Order')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-13-logistics-domain.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 14: process-fulfillment-order flow
    // ════════════════════════════════════════════════════════════════

    await dblclickText(page, 'order.approved event');
    await expect(page.getByText('Fulfillment Orchestrator')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-14-fulfillment-flow.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 15: Orchestrator node selected — spec panel
    // ════════════════════════════════════════════════════════════════

    await page.getByText('Fulfillment Orchestrator').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/fp-15-orchestrator-node.png' });

    // ════════════════════════════════════════════════════════════════
    // SCENE 16: Specs sidebar — toggle and show schemas
    // ════════════════════════════════════════════════════════════════

    // Deselect node by clicking canvas background (avoid toolbar on left)
    const canvas2 = page.locator('.react-flow__pane');
    await canvas2.click({ position: { x: 800, y: 400 } });
    await page.waitForTimeout(300);
    await page.getByText('Specs').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/demo/fp-16-specs-panel.png' });
    // Close specs panel by toggling
    await page.getByText('Specs').first().click();
    await page.waitForTimeout(300);

    // ════════════════════════════════════════════════════════════════
    // SCENE 17: Lock mode toggle
    // ════════════════════════════════════════════════════════════════

    await page.getByText('Lock', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/demo/fp-17-lock-mode.png' });
    // Toggle back
    await page.getByText('Locked').first().click();
    await page.waitForTimeout(500);

    // ════════════════════════════════════════════════════════════════
    // SCENE 18: Summary
    // ════════════════════════════════════════════════════════════════

    await terminalScene(page, [
      '',
      '',
      '  {bold}DDD Tool — Feature Preview Complete{/bold}',
      '',
      '  {green}✓{/green} {cyan}System Map{/cyan}        9 domains with cross-domain event wiring',
      '  {green}✓{/green} {cyan}Search{/cyan}            Cmd+K palette — instant navigation',
      '  {green}✓{/green} {cyan}Flow Canvas{/cyan}       Interactive editing with spec inspection',
      '  {green}✓{/green} {cyan}Validation{/cyan}        Real-time issue detection',
      '  {green}✓{/green} {cyan}Auto Layout{/cyan}       Automatic arrangement with undo',
      '  {green}✓{/green} {cyan}Node Placement{/cyan}    Visual node creation from toolbar',
      '  {green}✓{/green} {cyan}Orchestration{/cyan}     AI agent orchestrator with supervisor',
      '  {green}✓{/green} {cyan}Specs Sidebar{/cyan}     Schema and data model browser',
      '  {green}✓{/green} {cyan}Lock Mode{/cyan}         Prevent accidental edits',
      '',
      '  {dim}9 domains · 53 flows · 28 node types{/dim}',
      '  {dim}Enterprise-scale supply chain intelligence platform{/dim}',
      '',
      '  {dim}Learn more: github.com/cybersoloss/ddd-tool{/dim}',
      '',
      '',
    ], 'DDD Tool — Feature Preview', 'fp-18-summary.png');
  });
});
