/** How the lightbox advances through image versions. */
export type ProgressiveStrategy =
  | 'step-on-load' /** s1 → s2 → … each when that file loads */
  | 'smart' /** connection-aware ladder (default) */
  | 'quick' /** s1 then jump to final when ready */
  | 'full'; /** every tier, step-on-load */

export type ProgressiveFinalTarget = 'original' | 'recommended';

export interface ProgressiveViewOptions {
  strategy: ProgressiveStrategy;
  finalTarget: ProgressiveFinalTarget;
  /** Preload upcoming tiers in parallel while showing current. */
  preloadParallel: boolean;
  /** Optional crossfade when switching (0 = instant). */
  crossfadeMs: number;
  /** Minimum ms to keep a step visible (0 = switch as soon as loaded). */
  minStepMs: number;
  /** Cap how many steps to show (subsamples evenly). */
  maxSteps: number;
  connectionAware: boolean;
}

export type NetworkProfile = 'slow' | 'medium' | 'fast';

export function getConnectionHint(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return conn?.effectiveType;
}

export function getSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

const DEFAULT_OPTIONS: ProgressiveViewOptions = {
  strategy: 'smart',
  finalTarget: 'original',
  preloadParallel: true,
  crossfadeMs: 0,
  minStepMs: 0,
  maxSteps: 12,
  connectionAware: true,
};

function envStrategy(): ProgressiveStrategy | undefined {
  const raw = process.env.REACT_APP_PROGRESSIVE_STRATEGY?.trim().toLowerCase();
  if (raw === 'step-on-load' || raw === 'smart' || raw === 'quick' || raw === 'full') {
    return raw;
  }
  return undefined;
}

export function getNetworkProfile(): NetworkProfile {
  if (typeof navigator === 'undefined') return 'fast';
  if (getSaveData()) return 'slow';
  const type = getConnectionHint();
  if (type === 'slow-2g' || type === '2g') return 'slow';
  if (type === '3g') return 'medium';
  return 'fast';
}

/** Merge env, network profile, and caller overrides. */
export function resolveProgressiveViewOptions(
  overrides?: Partial<ProgressiveViewOptions>
): ProgressiveViewOptions {
  const base: ProgressiveViewOptions = {
    ...DEFAULT_OPTIONS,
    strategy: envStrategy() ?? DEFAULT_OPTIONS.strategy,
    ...overrides,
  };

  if (!base.connectionAware) return base;

  const network = getNetworkProfile();
  if (base.strategy !== 'smart') return base;

  if (network === 'slow') {
    return {
      ...base,
      maxSteps: Math.min(base.maxSteps, 3),
      finalTarget: 'recommended',
    };
  }
  if (network === 'medium') {
    return {
      ...base,
      maxSteps: Math.min(base.maxSteps, 6),
    };
  }
  return base;
}

export function strategyLabel(strategy: ProgressiveStrategy): string {
  switch (strategy) {
    case 'step-on-load':
      return 'Step';
    case 'quick':
      return 'Quick';
    case 'full':
      return 'Full';
    default:
      return 'Smart';
  }
}
