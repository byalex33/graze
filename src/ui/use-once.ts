import { useRef, useState } from 'react';

/**
 * Wraps a save-and-close action so it runs once: further taps do nothing, including during
 * the closing animation. If the action throws it unlocks, so the user can try again.
 * Returns the guarded action and whether it has started, for dimming the button.
 */
export function useOnce<A extends unknown[]>(action: (...args: A) => Promise<void>): [(...args: A) => Promise<void>, boolean] {
  const started = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = async (...args: A) => {
    if (started.current) return;
    started.current = true;
    setBusy(true);
    try {
      await action(...args);
    } catch (e) {
      started.current = false;
      setBusy(false);
      throw e;
    }
  };

  return [run, busy];
}
