import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle, XCircle, Loader2, FolderOpen, SkipForward } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore, DEFAULT_SETTINGS } from '../../stores/app-store';
import { createSampleProject } from '../../utils/sample-project';
import type { GlobalSettings } from '../../types/app';

const STEPS = ['Claude Code', 'Get Started'] as const;

export function FirstRunWizard() {
  const [step, setStep] = useState(0);
  const saveSettings = useAppStore((s) => s.saveSettings);
  const openProject = useAppStore((s) => s.openProject);
  const setView = useAppStore((s) => s.setView);

  // Step 1: Claude Code state
  const [claudeDetected, setClaudeDetected] = useState<boolean | null>(null);
  const [claudePath, setClaudePath] = useState('claude');
  const [claudeEnabled, setClaudeEnabled] = useState(true);
  const [detectingClaude, setDetectingClaude] = useState(false);

  // Step 2: Starting point
  const [startChoice, setStartChoice] = useState<'new' | 'open' | 'sample'>('new');
  const [completing, setCompleting] = useState(false);

  async function detectClaude() {
    setDetectingClaude(true);
    try {
      const result: string = await invoke('run_command', {
        command: 'which',
        args: [claudePath],
        cwd: '/',
      });
      setClaudeDetected(result.trim().length > 0);
      if (result.trim().length > 0) {
        setClaudePath(result.trim());
      }
    } catch {
      setClaudeDetected(false);
    } finally {
      setDetectingClaude(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);

    const settings: GlobalSettings = {
      ...DEFAULT_SETTINGS,
      claudeCode: {
        ...DEFAULT_SETTINGS.claudeCode,
        enabled: claudeEnabled,
        command: claudePath,
      },
    };

    await saveSettings(settings);

    if (startChoice === 'open') {
      try {
        const selected = await open({ directory: true, multiple: false });
        if (selected) {
          openProject(selected as string);
          return;
        }
      } catch {
        // Fall through to launcher
      }
    } else if (startChoice === 'sample') {
      try {
        const samplePath = await createSampleProject();
        openProject(samplePath);
        return;
      } catch {
        // Fall through to launcher
      }
    }

    // 'new' or fallback — go to launcher
    setView('launcher');
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4">
      <div className="card w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Welcome to DDD Tool</h2>
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < step
                      ? 'bg-success text-white'
                      : i === step
                        ? 'bg-accent text-white'
                        : 'bg-bg-tertiary text-text-muted'
                  }`}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Claude Code */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Claude Code enables automated implementation from your flow designs.
              </p>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Claude Code CLI</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={claudeEnabled}
                      onChange={(e) => setClaudeEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-accent"
                    />
                    <span className="text-xs text-text-secondary">Enable</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={claudePath}
                    onChange={(e) => {
                      setClaudePath(e.target.value);
                      setClaudeDetected(null);
                    }}
                    placeholder="Path to claude CLI"
                  />
                  <button
                    className="btn-secondary text-xs"
                    onClick={detectClaude}
                    disabled={detectingClaude}
                  >
                    {detectingClaude ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Detect'}
                  </button>
                </div>

                {claudeDetected === true && (
                  <div className="flex items-center gap-2 text-success text-xs">
                    <CheckCircle className="w-4 h-4" />
                    Found at {claudePath}
                  </div>
                )}
                {claudeDetected === false && (
                  <div className="flex items-center gap-2 text-danger text-xs">
                    <XCircle className="w-4 h-4" />
                    Not found. You can install it later or provide the correct path.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Get Started */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Choose how to get started.
              </p>

              <label
                className={`card p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  startChoice === 'new' ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setStartChoice('new')}
              >
                <input
                  type="radio"
                  name="start"
                  checked={startChoice === 'new'}
                  onChange={() => setStartChoice('new')}
                  className="mt-1 accent-accent"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">New Project</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Create a new DDD project from scratch
                  </p>
                </div>
              </label>

              <label
                className={`card p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  startChoice === 'open' ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setStartChoice('open')}
              >
                <input
                  type="radio"
                  name="start"
                  checked={startChoice === 'open'}
                  onChange={() => setStartChoice('open')}
                  className="mt-1 accent-accent"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Open Existing</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Open an existing DDD project folder
                  </p>
                </div>
              </label>

              <label
                className={`card p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  startChoice === 'sample' ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setStartChoice('sample')}
              >
                <input
                  type="radio"
                  name="start"
                  checked={startChoice === 'sample'}
                  onChange={() => setStartChoice('sample')}
                  className="mt-1 accent-accent"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Explore Sample</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Open a pre-built sample project with 3 domains and 5 flows
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          {step === 0 ? (
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                // Skip wizard entirely with defaults
                saveSettings(DEFAULT_SETTINGS);
                setView('launcher');
              }}
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip Setup
            </button>
          ) : (
            <button className="btn-ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step < 1 ? (
            <button
              className="btn-primary"
              onClick={() => {
                if (claudeDetected === null && claudeEnabled) {
                  detectClaude();
                }
                setStep(step + 1);
              }}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="btn-primary"
              disabled={completing}
              onClick={handleComplete}
            >
              {completing ? 'Setting up...' : (
                <>
                  {startChoice === 'open' && <FolderOpen className="w-4 h-4" />}
                  {startChoice === 'open' ? 'Open Project' : startChoice === 'sample' ? 'Open Sample' : 'Get Started'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
