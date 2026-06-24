/**
 * AudioWorkletRegistry — safely register and cache worklet modules.
 * Handles browser support detection and duplicate-registration guard.
 */

const registeredModules = new WeakMap<AudioContext, Set<string>>();

function getCtxSet(ctx: AudioContext): Set<string> {
  let set = registeredModules.get(ctx);
  if (!set) {
    set = new Set<string>();
    registeredModules.set(ctx, set);
  }
  return set;
}

export async function registerWorklet(
  ctx: AudioContext,
  moduleUrl: string
): Promise<boolean> {
  if (!ctx.audioWorklet) {
    console.warn("AudioWorklet not supported in this browser");
    return false;
  }
  const ctxSet = getCtxSet(ctx);
  if (ctxSet.has(moduleUrl)) {
    return true;
  }
  try {
    await ctx.audioWorklet.addModule(moduleUrl);
    ctxSet.add(moduleUrl);
    return true;
  } catch (err) {
    console.error(`Failed to register worklet ${moduleUrl}:`, err);
    return false;
  }
}

export function clearWorkletRegistry() {
  // WeakMap cleans up automatically when contexts are GC'd
}
