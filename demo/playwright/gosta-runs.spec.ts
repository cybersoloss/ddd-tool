import { test } from '@playwright/test';
import { renderTerminal } from './terminal';

/**
 * GOSTA Runs — Medium.com GIF
 *
 * Companion to warapp-medium.spec.ts.
 * Shows the four governed GOSTA runs that produced warapp-product-definition.md
 * BEFORE DDD enters the picture.
 *
 * ~8 scenes for a single GIF covering the article's "Four Runs" sections.
 */

async function terminalScene(
  page: import('@playwright/test').Page,
  lines: string[],
  title: string,
  filename: string,
  delay = 5000,
) {
  await page.setContent(renderTerminal({ lines, title }));
  await page.waitForTimeout(delay);
  await page.screenshot({ path: `test-results/demo/${filename}` });
}

test.describe('GOSTA Runs — Medium GIF', () => {

  test('Four governed runs → product definition', async ({ page }) => {

    // ═══════════════════════════════════════════════════════════
    // SCENE 1: Goal — What the Governor sets up
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '',
      '  {bold}GOSTA — Agentic Execution Architecture{/bold}',
      '  {dim}Governor: you{/dim}',
      '',
      '  {white}Goal:{/white}',
      '  Use GOSTA to analyze the Iran-Israel-USA conflict in an unbiased way',
      '  by having users define rough verticals, with intel gathered via web search.',
      '  See where the framework needs enhancement in the process.',
      '',
      '  {white}Value proposition:{/white}',
      '  {cyan}Reach your truths via your analysis based on your parameters.{/cyan}',
      '',
      '  {white}Operating document:{/white}',
      '    Guardrails ............... 4 constraints',
      '    Objectives ............... 2 (multi-domain analysis + framework feedback)',
      '    Strategies ............... 2 (iterative runs + designed failure)',
      '    Kill conditions .......... pre-committed per run',
      '',
      '  {white}Domain models:{/white}',
      '    Military & Security          {green}●{/green} 6-component',
      '    Economic & Sanctions          {green}●{/green} 6-component',
      '    Diplomatic & International    {green}●{/green} 6-component',
      '',
      '  {white}Wrapper:{/white} Claude Cowork (files + conversation)',
      '  {white}Planned runs:{/white} 4',
      '',
    ], 'GOSTA — Setup', 'gosta-01-goal.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 2: Run 1 — Framework validation
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '  {bold}Run 1: Can GOSTA handle this domain?{/bold}',
      '  {dim}5 domains · naive user · 3-session lifecycle{/dim}',
      '',
      '  {white}Bootstrap{/white}',
      '    {green}✓{/green} Built 5 domain models from keywords',
      '    {green}✓{/green} Operating document approved by Governor',
      '',
      '  {white}Analysis{/white}',
      '    {green}✓{/green} Web search: 42 sources gathered',
      '    {green}✓{/green} Signal triage: 42 → 18 signals retained',
      '    {green}✓{/green} Independent assessments: Military, Economic, Diplomatic,',
      '      Domestic Politics, Information & Intelligence',
      '    {green}✓{/green} Synthesis: {cyan}4 cross-domain tensions surfaced{/cyan}',
      '      {yellow}BLOCKING:{/yellow} Military advantage ≠ negotiating leverage',
      '      {dim}MATERIAL: Economic pressure timeline vs. military escalation{/dim}',
      '      {dim}MATERIAL: Diplomatic framing vs. domestic political constraints{/dim}',
      '      {dim}INFORMATIONAL: Intelligence source credibility variance{/dim}',
      '',
      '  {white}Framework feedback{/white}',
      '    {yellow}!{/yellow} No signal triage mechanism — 42 raw sources overwhelmed assessment',
      '    {yellow}!{/yellow} No temporal validity — analysis expires but framework has no concept of this',
      '    {yellow}!{/yellow} "politics" silently mapped to 2 domains without disambiguation',
      '',
      '  {white}Governor decision:{/white} {green}proceed → product definition v0.1{/green}',
      '',
    ], 'GOSTA — Run 1', 'gosta-02-run1.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 3: Run 2 — Product validation
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '  {bold}Run 2: Would a user pay for this?{/bold}',
      '  {dim}Product validation · architecture decisions{/dim}',
      '',
      '  {white}Questions tested:{/white}',
      '    1. Does the tension map tell users something new?',
      '    2. What is the minimum viable domain model?',
      '    3. Does it generalize beyond geopolitics?',
      '',
      '  {white}Governor decisions:{/white}',
      '    {green}✓{/green} Domain model minimum: 3 components (not 6)',
      '    {green}✓{/green} Domain count: 3–5 per analysis',
      '    {green}✓{/green} Agent isolation: Level 2 (sequential, no back-revision)',
      '    {green}✓{/green} Business model: credits, no subscription, no expiry',
      '',
      '  {white}Economics validated:{/white}',
      '    3-domain analysis cost ......... ~$0.38',
      '    Credit price ................... $1.50',
      '    Margin ......................... {green}75%{/green}',
      '    Free trial ..................... 3 credits (1 analysis)',
      '',
      '  {white}Governor decision:{/white} {green}proceed → product definition v0.2{/green}',
      '',
    ], 'GOSTA — Run 2', 'gosta-03-run2.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 4: Run 3 — UX + user journey
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '  {bold}Run 3: What does the user actually experience?{/bold}',
      '  {dim}3 domains · naive user · UX-focused{/dim}',
      '',
      '  {white}7-step user journey defined:{/white}',
      '    {white}Step 1{/white}  Select analytical lenses        {green}✓{/green} disambiguation UI',
      '    {white}Step 2{/white}  Ask your question               {green}✓{/green} visible decomposition',
      '    {white}Step 3{/white}  Intelligence gathering           {green}✓{/green} real-time progress',
      '    {white}Step 4{/white}  Domain assessments streamed      {green}✓{/green} Level 2 isolation',
      '    {white}Step 5{/white}  Key tension revealed             {green}✓{/green} interactive card',
      '    {white}Step 6{/white}  Full output delivered            {green}✓{/green} 4-layer accordion',
      '    {white}Step 7{/white}  Missing domain warning           {green}✓{/green} concrete upsell',
      '',
      '  {white}Baselines established:{/white}',
      '    Signal triage ............. 53% pass (30 raw → 10 signals)',
      '    Time to first insight ..... ~35 seconds',
      '    Tensions surfaced ......... {cyan}4 (1 blocking, 2 material, 1 info){/cyan}',
      '    3-domain minimum .......... {green}confirmed sufficient{/green}',
      '',
      '  {white}Governor decision:{/white} {green}proceed → product definition v0.3{/green}',
      '',
    ], 'GOSTA — Run 3', 'gosta-04-run3.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 5: Run 4 — Designed failure
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '  {bold}Run 4: Design it to break{/bold}',
      '  {dim}3 domains · informed user · 2 intentionally bad domain models{/dim}',
      '',
      '  {white}Setup:{/white}',
      '    {green}●{/green} Military-Security           pre-built (good)',
      '    {red}●{/red} Political Risk Assessment    user-created (intentionally vague)',
      '    {red}●{/red} Media & Information Warfare  user-created (intentionally generic)',
      '',
      '  {white}Quality detection:{/white}',
      '    Political Risk ... {yellow}CAUGHT{/yellow} 82% overlap with Military',
      '    Media & Info ..... {red}MISSED{/red} topically adjacent but analytically disconnected',
      '',
      '  {white}Missing guardrail exposed:{/white}',
      '    {yellow}!{/yellow} System checks domain overlap but not analytical relevance',
      '',
      '  {white}Informed user friction:{/white}',
      '    {yellow}!{/yellow} Pre-decomposed questions bypass standard flow',
      '    {yellow}!{/yellow} No mechanism for user hypotheses',
      '    {yellow}!{/yellow} Users notice and challenge isolation artifacts',
      '',
      '  {white}Product design changes:{/white}',
      '    {green}+{/green} Dual-persona UX (naive / advanced toggle)',
      '    {green}+{/green} Hypothesis injection step',
      '    {green}+{/green} Domain quality badges (Expert / Community-verified / Community-new)',
      '    {green}+{/green} Credit protection: first replacement free',
      '',
      '  {white}Governor decision:{/white} {green}proceed → product definition v0.4{/green}',
      '',
    ], 'GOSTA — Run 4 (Designed Failure)', 'gosta-05-run4.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 6: Framework enhancements
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '  {bold}Framework enhancements from 4 runs{/bold}',
      '',
      '  {white}GOSTA specification:{/white}',
      '    {green}+{/green} Signal triage mechanism             {dim}(Run 1 gap){/dim}',
      '    {green}+{/green} Analytical guardrails               {dim}(Run 4 gap){/dim}',
      '    {green}+{/green} Qualitative kill conditions          {dim}(Run 4 gap){/dim}',
      '    {green}+{/green} Domain completeness checks           {dim}(Run 1 gap){/dim}',
      '    {green}+{/green} Composite score normalization        {dim}(Run 3 gap){/dim}',
      '    {green}+{/green} Temporal validity for signals        {dim}(Run 1 gap){/dim}',
      '',
      '  {white}Cowork protocol:{/white}',
      '    {green}+{/green} Compound signal model                {dim}(Run 1){/dim}',
      '    {green}+{/green} Source credibility modifiers          {dim}(Run 3){/dim}',
      '    {green}+{/green} Tension severity classification      {dim}(Run 3){/dim}',
      '    {green}+{/green} Phase gate enforcement                {dim}(Run 2){/dim}',
      '',
      '  {dim}Recursive improvement: GOSTA governs a process,{/dim}',
      '  {dim}the process exposes gaps, the gaps improve GOSTA.{/dim}',
      '',
    ], 'GOSTA — Framework Evolution', 'gosta-06-enhancements.png');

    // ═══════════════════════════════════════════════════════════
    // SCENE 7: Product definition summary
    // ═══════════════════════════════════════════════════════════

    await terminalScene(page, [
      '',
      '  {bold}warapp-product-definition.md (v0.4){/bold}',
      '  {dim}Governed artifact — 4 runs, each enhancing the last{/dim}',
      '',
      '  {cyan}Reach your truths via your analysis based on your parameters.{/cyan}',
      '',
      '  User journey ............... 7 steps (dual persona: naive + informed)',
      '  Domain model library ....... 15–20 pre-built across 3 verticals',
      '  Agent architecture ......... Level 2 isolation (sequential, no back-revision)',
      '  Output ..................... 4-layer analysis with tension cards',
      '  Business model ............. Credit-based, no subscription, 75% margin',
      '  Quality protection ......... Domain badges + automated quality tests',
      '  Credit protection .......... First replacement free on quality failure',
      '',
      '  {white}Baselines:{/white}',
      '    Cost per analysis .......... $0.38 (3 domains)',
      '    Time to first insight ...... ~35s',
      '    Signal triage ratio ........ 53%',
      '    Tensions (3 good domains) .. 4 (1 blocking)',
      '',
      '  {dim}Ready for /ddd-create →{/dim}',
      '',
    ], 'GOSTA → Product Definition', 'gosta-07-product-definition.png');

  });
});
