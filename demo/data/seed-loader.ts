/**
 * Seed data loader — selects the right project seed based on VITE_DEMO_PROJECT.
 *
 * Default: expense-scanner (existing demo)
 * Set VITE_DEMO_PROJECT=vantage for the vantage supply chain project.
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

export const SEED_FILES = project === 'vantage' ? VANTAGE_FILES : EXPENSE_FILES;
export const DEMO_HOME = project === 'vantage' ? VANTAGE_HOME : EXPENSE_HOME;
export const DEMO_PROJECT_PATH = project === 'vantage' ? VANTAGE_PATH : EXPENSE_PATH;
