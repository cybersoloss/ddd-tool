import { useState } from 'react';
import { AlertTriangle, X, Check, RefreshCw, ArrowUpCircle, AlertOctagon, MessageSquare } from 'lucide-react';
import { useImplementationStore } from '../../stores/implementation-store';
import type { SyncState } from '../../types/implementation';

interface Props {
  flowKey: string;
}

const driftConfig: Record<string, { bg: string; border: string; icon: typeof AlertTriangle; iconColor: string; textColor: string; message: string }> = {
  spec_ahead: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    textColor: 'text-amber-200',
    message: 'Spec changed since implementation',
  },
  code_ahead: {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    icon: ArrowUpCircle,
    iconColor: 'text-blue-400',
    textColor: 'text-blue-200',
    message: 'Code has changes not in spec',
  },
  diverged: {
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    icon: AlertOctagon,
    iconColor: 'text-red-400',
    textColor: 'text-red-200',
    message: 'Both spec and code changed',
  },
};

export function StaleBanner({ flowKey }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const resolveFlow = useImplementationStore((s) => s.resolveFlow);
  const mapping = useImplementationStore((s) => s.mappings[flowKey]);
  const annotations = useImplementationStore((s) => s.annotations[flowKey]);

  if (dismissed) return null;

  const syncState: SyncState | undefined = mapping?.syncState;
  const annotationCount = mapping?.annotationCount ?? 0;
  const pendingAnnotations = annotations?.patterns?.filter(
    (p) => p.status === 'candidate' || p.status === 'approved'
  ).length ?? annotationCount;

  const config = syncState ? driftConfig[syncState] : driftConfig.spec_ahead;
  if (!config && pendingAnnotations === 0) return null;

  const DriftIcon = config?.icon ?? AlertTriangle;

  return (
    <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 ${config?.bg ?? 'bg-amber-500/15'} ${config?.border ?? 'border-amber-500/30'} border rounded-lg backdrop-blur-sm max-w-xl`}>
      <DriftIcon className={`w-4 h-4 ${config?.iconColor ?? 'text-amber-400'} shrink-0`} />
      <span className={`text-xs ${config?.textColor ?? 'text-amber-200'}`}>
        {config?.message ?? 'This flow has drifted'}
      </span>

      {pendingAnnotations > 0 && (
        <span className="flex items-center gap-1 text-xs text-blue-300">
          <MessageSquare className="w-3 h-3" />
          {pendingAnnotations} annotation{pendingAnnotations !== 1 ? 's' : ''} pending
        </span>
      )}

      <div className="flex items-center gap-1.5 ml-2">
        {syncState === 'code_ahead' && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(`/ddd-reflect ${flowKey}`);
            }}
            title="Copy /ddd-reflect command to clipboard"
          >
            <RefreshCw className="w-3 h-3" />
            Reflect
          </button>
        )}
        {(syncState === 'spec_ahead' || !syncState) && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded transition-colors"
            onClick={() => {
              navigator.clipboard.writeText('/ddd-sync');
            }}
            title="Copy /ddd-sync command to clipboard"
          >
            <RefreshCw className="w-3 h-3" />
            Sync
          </button>
        )}
        <button
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded transition-colors"
          onClick={() => resolveFlow(flowKey, 'accept')}
        >
          <Check className="w-3 h-3" />
          Accept
        </button>
      </div>
      <button
        className="p-0.5 text-amber-400/60 hover:text-amber-400 transition-colors"
        onClick={() => setDismissed(true)}
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
