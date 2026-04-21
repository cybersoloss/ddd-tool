import { X } from 'lucide-react';
import { useSheetStore } from '../../stores/sheet-store';
import { useProjectStore } from '../../stores/project-store';
import type { SheetLocation } from '../../types/sheet';

function getTabLabel(location: SheetLocation, domainConfigs: ReturnType<typeof useProjectStore.getState>['domainConfigs']): string {
  if (location.level === 'system') return 'System';
  if (location.level === 'diagram') return 'Diagrams';
  if (location.level === 'domain' && location.domainId) {
    return domainConfigs[location.domainId]?.name ?? location.domainId;
  }
  if (location.level === 'flow' && location.domainId && location.flowId) {
    const domain = domainConfigs[location.domainId];
    return domain?.flows.find((f) => f.id === location.flowId)?.name ?? location.flowId;
  }
  return 'Unknown';
}

function locationEquals(a: SheetLocation, b: SheetLocation): boolean {
  return a.level === b.level && a.domainId === b.domainId && a.flowId === b.flowId && a.diagramId === b.diagramId;
}

export function SheetTabs() {
  const openTabs = useSheetStore((s) => s.openTabs);
  const current = useSheetStore((s) => s.current);
  const switchTab = useSheetStore((s) => s.switchTab);
  const removeTab = useSheetStore((s) => s.removeTab);
  const domainConfigs = useProjectStore((s) => s.domainConfigs);

  if (openTabs.length <= 1) return null;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-bg-secondary overflow-x-auto min-h-[32px]">
      {openTabs.map((tab, index) => {
        const isActive = locationEquals(tab, current);
        const label = getTabLabel(tab, domainConfigs);

        return (
          <div
            key={`${tab.level}-${tab.domainId ?? ''}-${tab.flowId ?? ''}-${tab.diagramId ?? ''}`}
            className={`group flex items-center gap-1 px-2.5 py-1 rounded text-xs cursor-pointer transition-colors shrink-0 ${
              isActive
                ? 'bg-bg-primary text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
            onClick={() => switchTab(index)}
          >
            <span className="truncate max-w-[120px]">{label}</span>
            {openTabs.length > 1 && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-bg-tertiary"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(index);
                }}
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
