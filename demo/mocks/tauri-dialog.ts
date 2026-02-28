/**
 * Mock for @tauri-apps/plugin-dialog
 * Returns the demo project path for directory pickers.
 */
import { DEMO_PROJECT_PATH } from '../data/seed-loader';

interface OpenDialogOptions {
  directory?: boolean;
  multiple?: boolean;
  defaultPath?: string;
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export async function open(options?: OpenDialogOptions): Promise<string | string[] | null> {
  // In demo mode, always return the sample project path for directory pickers
  if (options?.directory) {
    return DEMO_PROJECT_PATH;
  }
  return null;
}

export async function save(): Promise<string | null> {
  return null;
}

export async function message(
  _msg: string,
  _options?: { title?: string; type?: string },
): Promise<void> {
  // No-op
}

export async function ask(
  _msg: string,
  _options?: { title?: string; type?: string },
): Promise<boolean> {
  return true;
}

export async function confirm(
  _msg: string,
  _options?: { title?: string; type?: string },
): Promise<boolean> {
  return true;
}
