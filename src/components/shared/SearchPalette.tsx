import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Layers, GitBranch, Box } from 'lucide-react';
import { useUiStore } from '../../stores/ui-store';
import { useProjectStore } from '../../stores/project-store';
import { useFlowStore } from '../../stores/flow-store';
import { useSheetStore } from '../../stores/sheet-store';

interface SearchResult {
  type: 'domain' | 'flow' | 'node';
  label: string;
  breadcrumb: string;
  domainId: string;
  flowId?: string;
  nodeId?: string;
}

export function SearchPalette() {
  const closeSearch = useUiStore((s) => s.closeSearch);
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const navigateToDomain = useSheetStore((s) => s.navigateToDomain);
  const navigateToFlow = useSheetStore((s) => s.navigateToFlow);
  const selectNode = useFlowStore((s) => s.selectNode);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches: SearchResult[] = [];

    for (const [domainId, config] of Object.entries(domainConfigs)) {
      // Search domain names
      if (config.name?.toLowerCase().includes(q) || domainId.toLowerCase().includes(q)) {
        matches.push({
          type: 'domain',
          label: config.name || domainId,
          breadcrumb: 'System',
          domainId,
        });
      }

      // Search flows
      const flows = Array.isArray(config.flows) ? config.flows : [];
      for (const flow of flows) {
        const nameMatch = flow.name?.toLowerCase().includes(q) || flow.id?.toLowerCase().includes(q);
        const descMatch = flow.description?.toLowerCase().includes(q);
        if (nameMatch || descMatch) {
          matches.push({
            type: 'flow',
            label: flow.name || flow.id,
            breadcrumb: config.name || domainId,
            domainId,
            flowId: flow.id,
          });
        }
      }
    }

    // Search nodes in current flow
    if (currentFlow) {
      const flowDomain = currentFlow.flow?.domain || '';
      const flowName = currentFlow.flow?.name || currentFlow.flow?.id || '';
      const domainName = domainConfigs[flowDomain]?.name || flowDomain;

      const allNodes = [
        currentFlow.trigger,
        ...(Array.isArray(currentFlow.nodes) ? currentFlow.nodes : []),
      ];

      for (const node of allNodes) {
        if (!node) continue;
        const labelMatch = node.label?.toLowerCase().includes(q);
        const typeMatch = node.type?.toLowerCase().includes(q);
        if (labelMatch || typeMatch) {
          matches.push({
            type: 'node',
            label: `${node.label || node.id} (${node.type})`,
            breadcrumb: `${domainName} > ${flowName}`,
            domainId: flowDomain,
            flowId: currentFlow.flow?.id,
            nodeId: node.id,
          });
        }
      }
    }

    return matches.slice(0, 20);
  }, [query, domainConfigs, currentFlow]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      closeSearch();
      if (result.type === 'domain') {
        navigateToDomain(result.domainId);
      } else if (result.type === 'flow' && result.flowId) {
        navigateToFlow(result.domainId, result.flowId);
      } else if (result.type === 'node' && result.flowId) {
        navigateToFlow(result.domainId, result.flowId);
        // Select node after navigation settles
        setTimeout(() => {
          selectNode(result.nodeId ?? null);
        }, 100);
      }
    },
    [closeSearch, navigateToDomain, navigateToFlow, selectNode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [closeSearch, results, selectedIndex, handleSelect],
  );

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const iconFor = (type: SearchResult['type']) => {
    switch (type) {
      case 'domain':
        return <Layers className="w-4 h-4 text-accent shrink-0" />;
      case 'flow':
        return <GitBranch className="w-4 h-4 text-green-400 shrink-0" />;
      case 'node':
        return <Box className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={closeSearch}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-bg-primary border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            placeholder="Search domains, flows, nodes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-[10px] text-text-muted bg-bg-secondary border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              No results found
            </div>
          )}
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.domainId}-${result.flowId ?? ''}-${result.nodeId ?? ''}-${index}`}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-accent/15 text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {iconFor(result.type)}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{result.label}</div>
                <div className="text-xs text-text-muted truncate">
                  {result.breadcrumb}
                </div>
              </div>
              <span className="text-[10px] text-text-muted uppercase shrink-0">
                {result.type}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {!query.trim() && (
          <div className="px-4 py-3 text-xs text-text-muted border-t border-border">
            Type to search across domains, flows, and nodes
          </div>
        )}
      </div>
    </div>
  );
}
