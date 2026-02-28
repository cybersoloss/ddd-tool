/**
 * Terminal HTML renderer for lifecycle demo scenes.
 * Generates a macOS-style terminal window with dark background and monospace text.
 */

export interface TerminalOptions {
  /** Window title shown in the title bar */
  title?: string;
  /** Lines of terminal output — supports ANSI-like color markers */
  lines: string[];
}

/**
 * Render an HTML page that looks like a macOS terminal window.
 * Used via `page.setContent(renderTerminal({ lines, title }))`.
 */
export function renderTerminal({ lines, title = 'Terminal' }: TerminalOptions): string {
  const escapedLines = lines.map(line =>
    line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Color markers: {green}text{/green}, {cyan}text{/cyan}, etc.
      .replace(/\{green\}(.*?)\{\/green\}/g, '<span style="color:#4ade80">$1</span>')
      .replace(/\{cyan\}(.*?)\{\/cyan\}/g, '<span style="color:#22d3ee">$1</span>')
      .replace(/\{yellow\}(.*?)\{\/yellow\}/g, '<span style="color:#facc15">$1</span>')
      .replace(/\{red\}(.*?)\{\/red\}/g, '<span style="color:#f87171">$1</span>')
      .replace(/\{dim\}(.*?)\{\/dim\}/g, '<span style="color:#6b7280">$1</span>')
      .replace(/\{bold\}(.*?)\{\/bold\}/g, '<span style="font-weight:700;color:#f3f4f6">$1</span>')
      .replace(/\{white\}(.*?)\{\/white\}/g, '<span style="color:#f9fafb">$1</span>')
  );

  const titleEscaped = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 20px;
  }
  .terminal {
    background: #0d1117;
    border-radius: 10px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    width: 100%;
    max-width: 1200px;
    overflow: hidden;
  }
  .title-bar {
    background: #161b22;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #21262d;
  }
  .dot {
    width: 12px; height: 12px; border-radius: 50%;
  }
  .dot-red { background: #ff5f57; }
  .dot-yellow { background: #febc2e; }
  .dot-green { background: #28c840; }
  .title-text {
    color: #8b949e;
    font-size: 13px;
    flex: 1;
    text-align: center;
    margin-right: 52px;
  }
  .content {
    padding: 20px 24px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace;
    font-size: 15px;
    line-height: 1.7;
    color: #c9d1d9;
    white-space: pre-wrap;
    word-wrap: break-word;
    min-height: 200px;
  }
</style>
</head>
<body>
  <div class="terminal">
    <div class="title-bar">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
      <span class="title-text">${titleEscaped}</span>
    </div>
    <div class="content">${escapedLines.join('\n')}</div>
  </div>
</body>
</html>`;
}
