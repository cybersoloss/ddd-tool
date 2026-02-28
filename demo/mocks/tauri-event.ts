/**
 * Mock for @tauri-apps/api/event
 * No-op listener — demo mode has no file watcher events.
 */

type UnlistenFn = () => void;

export async function listen<T>(
  _event: string,
  _handler: (event: { payload: T }) => void,
): Promise<UnlistenFn> {
  // Return a no-op unlisten function
  return () => {};
}

export async function emit(_event: string, _payload?: unknown): Promise<void> {
  // No-op
}
