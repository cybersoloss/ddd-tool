import { AlertTriangle } from 'lucide-react';

interface Props {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ onSave, onDiscard, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Unsaved changes</h2>
            <p className="text-xs text-text-muted mt-1">
              You have unsaved changes in this flow. What would you like to do?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="btn-primary text-sm w-full"
            onClick={onSave}
          >
            Save and close
          </button>
          <button
            className="btn-ghost text-sm w-full text-red-400 hover:text-red-300"
            onClick={onDiscard}
          >
            Discard changes and close
          </button>
          <button
            className="btn-ghost text-sm w-full"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
