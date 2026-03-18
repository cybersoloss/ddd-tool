/**
 * Seed data loader — selects the right project seed based on VITE_DEMO_PROJECT.
 *
 * Default: expense-scanner (existing demo)
 * Set VITE_DEMO_PROJECT=vantage for the vantage supply chain project.
 * Set VITE_DEMO_PROJECT=warapp for the GOSTA warapp project.
 */

// Vite makes env vars available at build time via import.meta.env
const project = import.meta.env.VITE_DEMO_PROJECT as string | undefined;

// Dynamic import isn't great for tree-shaking, so we use static imports
// and select at runtime. Only one seed is included per build thanks to
// Vite's dead-code elimination when the env var is a build-time constant.
import {
  SEED_FILES as EXPENSE_FILES,
  DEMO_HOME as EXPENSE_HOME,
  DEMO_PROJECT_PATH as EXPENSE_PATH,
} from './seed-project';

import {
  SEED_FILES as VANTAGE_FILES,
  DEMO_HOME as VANTAGE_HOME,
  DEMO_PROJECT_PATH as VANTAGE_PATH,
} from './vantage-project';

import {
  SEED_FILES as WARAPP_FILES,
  DEMO_HOME as WARAPP_HOME,
  DEMO_PROJECT_PATH as WARAPP_PATH,
} from './warapp-project';

function selectSeed() {
  if (project === 'vantage') return { files: VANTAGE_FILES, home: VANTAGE_HOME, path: VANTAGE_PATH };
  if (project === 'warapp') return { files: WARAPP_FILES, home: WARAPP_HOME, path: WARAPP_PATH };
  return { files: EXPENSE_FILES, home: EXPENSE_HOME, path: EXPENSE_PATH };
}

const selected = selectSeed();
export const SEED_FILES = selected.files;
export const DEMO_HOME = selected.home;
export const DEMO_PROJECT_PATH = selected.path;
