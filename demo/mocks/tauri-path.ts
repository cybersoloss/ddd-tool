/**
 * Mock for @tauri-apps/api/path
 * Returns virtual paths for demo mode.
 */
import { DEMO_HOME } from '../data/seed-project';

export async function homeDir(): Promise<string> {
  return DEMO_HOME;
}

export async function appDataDir(): Promise<string> {
  return `${DEMO_HOME}/.ddd-tool`;
}

export async function resolve(...paths: string[]): Promise<string> {
  return paths.join('/');
}
