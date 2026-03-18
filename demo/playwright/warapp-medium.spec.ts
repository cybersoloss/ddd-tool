import { test, expect, type Page } from '@playwright/test';
import { renderTerminal } from './terminal';

/**
 * WarApp Medium.com GIF — GOSTA → DDD Pipeline
 *
 * Matches the article "The Human-AI Decision Boundary (Supplementary)"
 * showing the exact pipeline: /ddd-create --from warapp-product-definition.md
 * → /ddd-scaffold → /ddd-implement --all → DDD Tool views
 *
 * ~12 scenes for a single GIF covering both article placeholders.
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

test.describe('WarApp — Medium GIF', () => {

  test('GOSTA → DDD pipeline', async ({ page }) => {

    // ═══════════════════════════════════════════════════════════
    // SCENE 1: /ddd-create --from warapp-product-definition.md
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '{dim}>{/dim} /ddd-create --from warapp-product-definition.md',
      '',
      'Reading product definition... {green}✓{/green}',
      '  Source: GOSTA-governed product definition (v0.4)',
      '  4 runs: framework validation → product validation → UX → failure testing',
      '',
      'Extracting four pillars...',
      '',
      '  {cyan}Logic — 5 domains, 13 flows{/cyan}',
      '    {green}✓{/green} Analysis      7 flows — run-analysis, reveal-tensions, reweight-analysis...',
      '    {green}✓{/green} Domains       4 flows — select-domains, validate-domain-quality...',
      '    {green}✓{/green} Intelligence  3 flows — gather-intelligence, triage-signals...',
      '    {green}✓{/green} Users         2 flows — user-register, user-login',
      '    {green}✓{/green} Billing       3 flows — purchase-credits, consume-credit, refund-credit',
      '',
      '  {cyan}Data — 7 schemas{/cyan}',
      '    User · Analysis · DomainModel · Signal · CreditPack · CreditTransaction',
      '',
      '  {cyan}Interface — 11 pages{/cyan}',
      '    analysis-setup (7-step wizard) · analysis-results (4-layer accordion)',
      '    domain-library · billing · user-profile · landing...',
      '',
      '  {cyan}Infrastructure — 5 services{/cyan}',
      '    Next.js frontend · Express API · PostgreSQL · Redis · BullMQ worker',
      '',
      '  Events: {cyan}15 cross-domain connections{/cyan}',
      '    AnalysisStarted → IntelligenceGathered → AssessmentsComplete...',
      '',
      '{green}35 spec files created{/green} across specs/',
      '{dim}Next: /ddd-scaffold to set up project skeleton{/dim}',
    ], 'Claude Code — /ddd-create', 'warapp-01-create.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 2: /ddd-scaffold
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '{dim}>{/dim} /ddd-scaffold',
      '',
      'Reading specs: system.yaml, architecture.yaml, schemas/, ui/, infrastructure.yaml...',
      '',
      '  {cyan}Backend scaffold{/cyan}',
      '    {green}✓{/green} package.json — 24 dependencies',
      '    {green}✓{/green} src/server/ — routes, services, repositories, middleware',
      '    {green}✓{/green} Config loader from config.yaml (12 env vars)',
      '    {green}✓{/green} Error handler — 35 error codes from errors.yaml',
      '    {green}✓{/green} Prisma schema — 7 models with indexes',
      '    {green}✓{/green} BullMQ event infrastructure',
      '    {green}✓{/green} Integration clients: Claude API, Brave Search, Stripe',
      '',
      '  {cyan}Frontend scaffold{/cyan}',
      '    {green}✓{/green} Next.js 14 app router — 11 pages',
      '    {green}✓{/green} shadcn/ui component library',
      '    {green}✓{/green} Zustand stores — analysis, domains, billing',
      '    {green}✓{/green} Navigation: sidebar with 6 items',
      '',
      '  {cyan}Data scaffold{/cyan}',
      '    {green}✓{/green} 7 Prisma models with relationships and indexes',
      '    {green}✓{/green} Seed: 4 credit pack tiers (Try/Starter/Standard/Pro)',
      '',
      '  {cyan}Infrastructure scaffold{/cyan}',
      '    {green}✓{/green} docker-compose.yaml — 5 services',
      '    {green}✓{/green} dev:all script with startup order',
      '    {green}✓{/green} .env.example generated',
      '',
      '{green}Build passed ✓{/green}  Tests passed ✓',
      '{dim}Next: /ddd-implement --all to generate flow code{/dim}',
    ], 'Claude Code — /ddd-scaffold', 'warapp-02-scaffold.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 3: /ddd-implement --all
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '{dim}>{/dim} /ddd-implement --all',
      '',
      'Found {cyan}5 domains{/cyan}, {cyan}13 flows{/cyan}, {cyan}11 pages{/cyan}',
      '',
      '{bold}Logic:{/bold}',
      '  {white}[1/13]{/white}  analysis/run-analysis           {green}✓{/green} {dim}18 nodes, 7 files, 14 tests{/dim}',
      '  {white}[2/13]{/white}  analysis/reveal-tensions         {green}✓{/green} {dim}8 nodes, 3 files, 6 tests{/dim}',
      '  {white}[3/13]{/white}  analysis/reweight-analysis       {green}✓{/green} {dim}6 nodes, 3 files, 5 tests{/dim}',
      '  {white}[4/13]{/white}  domains/select-domains           {green}✓{/green} {dim}7 nodes, 3 files, 8 tests{/dim}',
      '  {white}[5/13]{/white}  domains/validate-domain-quality  {green}✓{/green} {dim}9 nodes, 3 files, 10 tests{/dim}',
      '  {white}[6/13]{/white}  domains/create-custom-domain     {green}✓{/green} {dim}8 nodes, 3 files, 7 tests{/dim}',
      '  {white}[7/13]{/white}  intelligence/gather-intelligence {green}✓{/green} {dim}14 nodes, 4 files, 12 tests{/dim}',
      '  {white}[8/13]{/white}  intelligence/triage-signals      {green}✓{/green} {dim}8 nodes, 3 files, 9 tests{/dim}',
      '  {white}[9-13]{/white} users + billing                  {green}✓{/green} {dim}5 flows, 28 tests{/dim}',
      '',
      '{bold}Interface:{/bold}',
      '  {white}[1/11]{/white}  analysis-setup (7-step wizard)  {green}✓{/green} {dim}7 sections, 3 forms{/dim}',
      '  {white}[2/11]{/white}  analysis-results (4-layer)      {green}✓{/green} {dim}4 sections, accordion{/dim}',
      '  {white}[3-11]{/white} 9 remaining pages                {green}✓{/green}',
      '',
      '{green}All 99 tests passed ✓{/green}',
      '{dim}Pillar balance: Data 7 · Interface 11 · Infra 5 · Logic 13{/dim}',
    ], 'Claude Code — /ddd-implement', 'warapp-03-implement.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 4: App — System Map (L1) — 5 domains
    // ═══════════════════════════════════════════════════════════

    await page.goto('/');
    await waitForBoot(page);
    await expect(page.getByText('warapp', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(2000);
    await page.getByText('warapp', { exact: true }).click();
    await expect(page.getByText('Analysis', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/demo/warapp-04-system-map.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 5: Analysis domain (L2) — flows
    // ═══════════════════════════════════════════════════════════

    await dblclickText(page, 'Multi-perspective analysis execution');
    await expect(page.getByText('Run Analysis')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/demo/warapp-05-analysis-domain.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 6: run-analysis flow (L3) — the main 7-step pipeline
    // ═══════════════════════════════════════════════════════════

    await dblclickText(page, 'Complete analysis pipeline');
    await expect(page.getByText('POST /analyses')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/demo/warapp-06-run-analysis-flow.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 7: Node selected — spec panel visible
    // ═══════════════════════════════════════════════════════════

    await page.getByText('Synthesize Output').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/demo/warapp-07-node-selected.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 8: Intelligence domain (L2)
    // ═══════════════════════════════════════════════════════════

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await dblclickText(page, 'Web search, signal triage');
    await expect(page.getByText('Gather Intelligence')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/demo/warapp-08-intelligence-domain.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 9: gather-intelligence flow (L3) — loop + events
    // ═══════════════════════════════════════════════════════════

    await dblclickText(page, 'Web search, signal collection');
    await expect(page.getByText('Loop Through Domains')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/demo/warapp-09-gather-intelligence-flow.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 10: Billing domain (L2) — credit flows
    // ═══════════════════════════════════════════════════════════

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await dblclickText(page, 'Credit management, pricing');
    await expect(page.getByText('Purchase Credits')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/demo/warapp-10-billing-domain.png' });

    // ═══════════════════════════════════════════════════════════
    // SCENE 11: Summary
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '',
      '  {bold}GOSTA product definition → DDD implementation specs{/bold}',
      '',
      '  {green}✓{/green} {cyan}/ddd-create{/cyan}     Read product definition, generated 35 spec files',
      '  {green}✓{/green} {cyan}/ddd-scaffold{/cyan}   Project skeleton across 4 pillars',
      '  {green}✓{/green} {cyan}/ddd-implement{/cyan}  13 flows, 11 pages, 99 tests passing',
      '',
      '  {dim}5 domains · 13 flows · 7 schemas · 11 pages · 15 events{/dim}',
      '  {dim}Every flow traceable to a product requirement.{/dim}',
      '  {dim}Every data model grounded in a defined user journey step.{/dim}',
      '',
      '  {dim}github.com/cybersoloss/DDD{/dim}',
      '',
    ], 'GOSTA → DDD — Complete', 'warapp-11-summary.png');
  });
});
