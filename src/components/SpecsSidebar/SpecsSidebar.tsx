import { useState } from 'react';
import { Database, Layout, Server, X } from 'lucide-react';
import { useUiStore } from '../../stores/ui-store';
import { useSpecsStore } from '../../stores/specs-store';
import { SchemaList } from './SchemaList';
import { UIPagesList } from './UIPagesList';
import { InfrastructureEditor } from './InfrastructureEditor';

type Tab = 'data' | 'interface' | 'infrastructure';

export function SpecsSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const toggleSpecsPanel = useUiStore((s) => s.toggleSpecsPanel);
  const schemas = useSpecsStore((s) => s.schemas);
  const baseSchema = useSpecsStore((s) => s.baseSchema);
  const pagesConfig = useSpecsStore((s) => s.pagesConfig);
  const infrastructure = useSpecsStore((s) => s.infrastructure);

  const schemaCount = Object.keys(schemas).length + (baseSchema ? 1 : 0);
  const pageCount = pagesConfig?.pages?.length ?? 0;
  const serviceCount = infrastructure?.services?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: typeof Database; count: number }[] = [
    { id: 'data', label: 'Data', icon: Database, count: schemaCount },
    { id: 'interface', label: 'Interface', icon: Layout, count: pageCount },
    { id: 'infrastructure', label: 'Infra', icon: Server, count: serviceCount },
  ];

  return (
    <div className="w-[320px] bg-bg-secondary border-r border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
          Project Specs
        </span>
        <button
          className="btn-icon !p-1"
          onClick={toggleSpecsPanel}
          title="Close specs panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs transition-colors ${
                isActive
                  ? 'text-accent border-b-2 border-accent bg-accent/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1 py-0.5 rounded-full leading-none ${
                  isActive ? 'bg-accent/20 text-accent' : 'bg-bg-hover text-text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'data' && <SchemaList />}
        {activeTab === 'interface' && <UIPagesList />}
        {activeTab === 'infrastructure' && <InfrastructureEditor />}
      </div>
    </div>
  );
}
