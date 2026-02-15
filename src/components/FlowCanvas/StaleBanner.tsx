import { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { useImplementationStore } from '../../stores/implementation-store';

interface Props {
  flowKey: string;
}

export function StaleBanner({ flowKey }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const resolveFlow = useImplementationStore((s) => s.resolveFlow);

  if (dismissed) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg backdrop-blur-sm max-w-lg">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-xs text-amber-200">
        This flow's spec has changed since it was implemented
      </span>
      <div className="flex items-center gap-1.5 ml-2">
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
