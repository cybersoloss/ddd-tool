import { test, expect, type Page } from '@playwright/test';
import { renderTerminal } from './terminal';

/**
 * DDD Lifecycle Demo — AI Expense Scanner
 *
 * Tells the story of building an AI expense scanner with DDD,
 * following the lifecycle phases in order:
 *   Phase 1 — Create (terminal)
 *   Phase 2 — Design (all app scenes)
 *   Phase 3 — Build (terminal)
 *   Phase 4 — Reflect (terminal)
 *
 * ~13 scenes total.
 */

async function waitForBoot(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('#root');
    return el && !el.textContent?.includes('Loading...');
  }, { timeout: 10_000 });
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

test.describe('DDD Lifecycle Demo', () => {

  test('full lifecycle — Create, Design, Build, Reflect', async ({ page }) => {

    // ════════════════════════════════════════════════════════════════
    // TITLE
    // ════════════════════════════════════════════════════════════════

    // ── Scene 1: Title Card ──────────────────────────────────────────
    await page.setContent(renderTerminal({
      title: 'DDD Lifecycle Demo',
      lines: [
        '',
        '  {bold}Building an Agent as an Expense Scanner{/bold}',
        '',
        '  {dim}A small, everyday example — building an AI agent as an{/dim}',
        '  {dim}expense scanner, designed and executed end-to-end using{/dim}',
        '  {dim}the DDD methodology.{/dim}',
        '',
        '  {dim}This demo walks through the full DDD lifecycle showing how{/dim}',
        '  {dim}agent design flows from idea to production-ready code.{/dim}',
        '',
        '  {cyan}The four phases:{/cyan}',
        '    {dim}Phase 1{/dim}  {cyan}Create{/cyan}    Describe → generate specs',
        '    {dim}Phase 2{/dim}  {cyan}Design{/cyan}    Review specs visually in DDD Tool',
        '    {dim}Phase 3{/dim}  {cyan}Build{/cyan}     Implement → test → iterate',
        '    {dim}Phase 4{/dim}  {cyan}Reflect{/cyan}   Capture patterns → sync',
        '',
      ],
    }));
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-01-title.png' });

    // ════════════════════════════════════════════════════════════════
    // PHASE 1 — CREATE
    // ════════════════════════════════════════════════════════════════

    // ── Scene 2: /ddd-create ─────────────────────────────────────────
    await terminalScene(page, [
      '{dim}>{/dim} /ddd-create "AI-powered expense management: scan receipts with AI,',
      '  auto-categorize expenses, route approvals by amount, generate monthly reports"',
      '',
      'Analyzing project description...',
      '  Domains: {cyan}3 identified{/cyan}',
      '    {green}✓{/green} Expenses — Receipt scanning, expense submission',
      '    {green}✓{/green} Approvals — Review workflows, reimbursement',
      '    {green}✓{/green} Reports — Monthly summaries, analytics',
      '',
      '  Flows: {cyan}5 designed{/cyan}',
      '    {green}✓{/green} expenses/scan-receipt {dim}(agent){/dim} — AI receipt OCR + human review',
      '    {green}✓{/green} expenses/submit-expense — Form validation + persistence',
      '    {green}✓{/green} approvals/review-expense — Smart routing by amount',
      '    {green}✓{/green} approvals/process-reimbursement — Payment processing',
      '    {green}✓{/green} reports/monthly-summary — Expense aggregation',
      '',
      '  Events: {cyan}4 cross-domain connections{/cyan}',
      '    ReceiptScanned        Expenses → Approvals',
      '    ExpenseSubmitted      Expenses → Approvals',
      '    ExpenseApproved       Approvals → Reports',
      '    ReimbursementProcessed  Approvals → Reports',
      '',
      'Specs created at: {green}specs/{/green}',
      '{dim}Next: Open DDD Tool to review and refine specs visually{/dim}',
    ], 'Claude Code — /ddd-create', 'lifecycle-02-create.png');

    // ════════════════════════════════════════════════════════════════
    // PHASE 2 — DESIGN (all app scenes)
    // ════════════════════════════════════════════════════════════════

    // ── Scene 3: App — System Map ────────────────────────────────────
    await page.goto('/');
    await waitForBoot(page);
    await expect(page.getByText('expense-scanner', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.getByText('expense-scanner', { exact: true }).click();
    await expect(page.getByText('Expenses', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-03-system-map.png' });

    // ── Scene 4: App — Expenses domain ───────────────────────────────
    await dblclickText(page, 'Receipt scanning and expense submission');
    await expect(page.getByText('Scan Receipt')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-04-expenses-domain.png' });

    // ── Scene 5: App — scan-receipt flow ─────────────────────────────
    await dblclickText(page, 'AI-powered receipt OCR with human review');
    await expect(page.getByText('Receipt Upload')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-05-scan-receipt-flow.png' });

    // ── Scene 6: App — agent_loop node selected ──────────────────────
    await page.getByText('Receipt Scanner').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-06-agent-node.png' });

    // ── Scene 7: App — Approvals domain ──────────────────────────────
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await dblclickText(page, 'Review workflows and reimbursement');
    await expect(page.getByText('Review Expense')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-07-approvals-domain.png' });

    // ── Scene 8: App — review-expense flow ───────────────────────────
    await dblclickText(page, 'Smart routing and approval by amount');
    await expect(page.getByText('Route by Amount')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/lifecycle-08-review-flow.png' });

    // ════════════════════════════════════════════════════════════════
    // PHASE 3 — BUILD
    // ════════════════════════════════════════════════════════════════

    // ── Scene 9: /ddd-implement --all ────────────────────────────────
    await terminalScene(page, [
      '{dim}>{/dim} /ddd-implement --all',
      '',
      'Found {cyan}3 domains{/cyan}, {cyan}5 flows{/cyan}',
      '',
      '{white}[1/5]{/white} expenses/scan-receipt {green}✓{/green}',
      '  → src/agents/receipt-scanner.ts {dim}(agent + 4 tools){/dim}',
      '  → src/agents/receipt-scanner.test.ts {dim}(12 tests){/dim}',
      '',
      '{white}[2/5]{/white} expenses/submit-expense {green}✓{/green}',
      '  → src/routes/expenses/submit.ts {dim}(3 files){/dim}',
      '  → src/routes/expenses/submit.test.ts {dim}(8 tests){/dim}',
      '',
      '{white}[3/5]{/white} approvals/review-expense {green}✓{/green}',
      '  → src/routes/approvals/review.ts {dim}(4 files){/dim}',
      '  → src/routes/approvals/review.test.ts {dim}(10 tests){/dim}',
      '',
      '{white}[4/5]{/white} approvals/process-reimbursement {green}✓{/green}',
      '  → src/routes/approvals/reimburse.ts {dim}(2 files){/dim}',
      '  → src/routes/approvals/reimburse.test.ts {dim}(6 tests){/dim}',
      '',
      '{white}[5/5]{/white} reports/monthly-summary {green}✓{/green}',
      '  → src/routes/reports/monthly.ts {dim}(2 files){/dim}',
      '  → src/routes/reports/monthly.test.ts {dim}(5 tests){/dim}',
      '',
      'Summary: {green}5 flows implemented{/green}, {green}41 tests created{/green}',
    ], 'Claude Code — /ddd-implement', 'lifecycle-09-implement.png');

    // ── Scene 10: /ddd-test --all ────────────────────────────────────
    await terminalScene(page, [
      '{dim}>{/dim} /ddd-test --all',
      '',
      '{bold}Domain          Flow                    Tests  Pass  Fail{/bold}',
      '{dim}──────────────  ──────────────────────  ─────  ────  ────{/dim}',
      'expenses        scan-receipt              12    12     0   {green}✓{/green}',
      'expenses        submit-expense             8     8     0   {green}✓{/green}',
      'approvals       review-expense            10    10     0   {green}✓{/green}',
      'approvals       process-reimbursement      6     6     0   {green}✓{/green}',
      'reports         monthly-summary            5     5     0   {green}✓{/green}',
      '',
      '{green}All 41 tests passed ✓{/green}',
    ], 'Claude Code — /ddd-test', 'lifecycle-10-test.png');

    // ════════════════════════════════════════════════════════════════
    // PHASE 4 — REFLECT
    // ════════════════════════════════════════════════════════════════

    // ── Scene 11: /ddd-reflect --all ─────────────────────────────────
    await terminalScene(page, [
      '{dim}>{/dim} /ddd-reflect --all',
      '',
      'Scanning implementation patterns...',
      '',
      '  {cyan}expenses/scan-receipt:{/cyan}',
      '    {green}+{/green} retry_logic: Exponential backoff on OCR failures {dim}(3x, 1s base){/dim}',
      '    {green}+{/green} confidence_threshold: Agent skips human gate if confidence > 95%',
      '',
      '  {cyan}approvals/review-expense:{/cyan}',
      '    {green}+{/green} audit_trail: All approval decisions logged to audit table',
      '    {green}+{/green} budget_check: Pre-validates department budget before approval',
      '',
      '  {cyan}reports/monthly-summary:{/cyan}',
      '    {green}+{/green} caching: Monthly aggregates cached for 24h in Redis',
      '',
      '{green}5 patterns captured{/green} → .ddd/annotations/',
      '{dim}Next: /ddd-promote --review to approve findings{/dim}',
    ], 'Claude Code — /ddd-reflect', 'lifecycle-11-reflect.png');

    // ── Scene 12: /ddd-sync --verify ─────────────────────────────────
    await terminalScene(page, [
      '{dim}>{/dim} /ddd-sync --verify',
      '',
      'Comparing specs ↔ code across {cyan}3 domains{/cyan}, {cyan}5 flows{/cyan}...',
      '',
      '{bold}Domain/Flow                 Nodes  Conform  Status{/bold}',
      '{dim}────────────────────────    ─────  ───────  ──────{/dim}',
      'expenses/scan-receipt          7       7    {green}✓ in_sync{/green}',
      'expenses/submit-expense        6       6    {green}✓ in_sync{/green}',
      'approvals/review-expense       9       9    {green}✓ in_sync{/green}',
      'approvals/process-reimburse    5       5    {green}✓ in_sync{/green}',
      'reports/monthly-summary        4       4    {green}✓ in_sync{/green}',
      '',
      '{green}All specs and code aligned ✓{/green}',
      '{dim}5 annotations pending promotion{/dim}',
    ], 'Claude Code — /ddd-sync', 'lifecycle-12-sync.png');

    // ════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════

    // ── Scene 13: Summary ────────────────────────────────────────────
    await terminalScene(page, [
      '',
      '',
      '  {bold}From idea to production — DDD lifecycle complete{/bold}',
      '',
      '  {green}✓{/green} {cyan}Create{/cyan}    3 domains, 5 flows, 4 events generated',
      '  {green}✓{/green} {cyan}Design{/cyan}    Specs reviewed and refined in DDD Tool',
      '  {green}✓{/green} {cyan}Build{/cyan}     41 tests passing across 5 flows',
      '  {green}✓{/green} {cyan}Reflect{/cyan}   5 patterns captured, all specs in sync',
      '',
      '  {dim}15 node types · 3 domains · 5 flows · 4 events{/dim}',
      '  {dim}Agent flow with guardrails, human gates, and tool use{/dim}',
      '  {dim}Smart routing, transactions, collections, transforms{/dim}',
      '',
      '  {dim}Learn more: github.com/cybersoloss/DDD{/dim}',
      '',
      '',
    ], 'DDD Lifecycle Complete', 'lifecycle-13-summary.png');
  });
});
