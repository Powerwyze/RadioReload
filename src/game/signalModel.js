// Tiers are relative to the current station: the reading is ranked against its own
// recent history, so the gun follows drops and builds instead of "is audio playing".
export const SIGNAL_HISTORY_SIZE = 90; // ~20s at the 220ms pulse rate
const MIN_HISTORY = 12; // ~2.6s of samples before ranking kicks in
const GREEN_RANK = 0.6;
const RED_RANK = 0.2;
// Hysteresis: once in a tier, the rank has to clearly cross back before it changes.
const GREEN_EXIT_RANK = 0.42;
const RED_EXIT_RANK = 0.35;

const MODE_LABELS = {
  'spectral-flux': 'flux',
  'low-end-energy': 'bass',
  composite: 'composite'
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getBaseSignal(modeId, metrics) {
  if (modeId === 'spectral-flux') {
    return clamp(metrics.spectralFlux ?? 0, 0, 1);
  }

  if (modeId === 'low-end-energy') {
    return clamp(metrics.lowEndEnergy ?? 0, 0, 1);
  }

  return clamp(
    (
      (metrics.pulseStrength ?? 0) +
      (metrics.confidence ?? 0) +
      (metrics.onsetDensity ?? 0) +
      (metrics.spectralFlux ?? 0)
    ) / 4,
    0,
    1
  );
}

function getRank(value, history) {
  if (history.length < MIN_HISTORY) {
    return null;
  }

  const below = history.filter((sample) => sample < value).length;
  return below / history.length;
}

function getTier(modeId, metrics, history, previousTier) {
  if (metrics.signalState === 'silence') {
    return 'red';
  }

  const rank = getRank(getBaseSignal(modeId, metrics), history);
  if (rank === null) {
    return 'yellow';
  }

  const greenFloor = previousTier === 'green' ? GREEN_EXIT_RANK : GREEN_RANK;
  const redCeiling = previousTier === 'red' ? RED_EXIT_RANK : RED_RANK;

  if (rank >= greenFloor) {
    return 'green';
  }

  return rank < redCeiling ? 'red' : 'yellow';
}

// `tier` is the tier actually in effect (after any hold), so the reason matches the gun.
export function getSignalDebug(modeId, metrics, history = [], tier = 'yellow') {
  const modeScore = getBaseSignal(modeId, metrics);
  const label = MODE_LABELS[modeId] ?? MODE_LABELS.composite;

  if (metrics.signalState === 'silence') {
    return { reason: 'silence gate', modeScore };
  }

  if (getRank(modeScore, history) === null) {
    return { reason: `${label} warming up`, modeScore };
  }

  return {
    reason:
      tier === 'green'
        ? `${label} peaking for this station`
        : tier === 'red'
          ? `${label} low for this station`
          : `${label} steady`,
    modeScore
  };
}

export function getModeScore(modeId, metrics) {
  return getBaseSignal(modeId, metrics);
}

export function getActivityTier(modeId, metrics, history = [], previousTier = null) {
  return getTier(modeId, metrics, history, previousTier);
}

export function getCadenceProfile(modeId, metrics, history = [], previousTier = null) {
  return getTierProfile(
    getTier(modeId, metrics, history, previousTier),
    getBaseSignal(modeId, metrics)
  );
}

export function getTierProfile(tier, modeScore = 0) {
  if (tier === 'green') {
    return {
      tier,
      powerScore: modeScore,
      cooldownMs: 145,
      label: 'Rapid',
      palette: {
        fill: 0x0f3d1d,
        glow: 0x56ff8a,
        accent: 0xb8ffd1
      }
    };
  }

  if (tier === 'yellow') {
    return {
      tier,
      powerScore: modeScore,
      cooldownMs: 630,
      label: 'Normal',
      palette: {
        fill: 0x423511,
        glow: 0xffd54a,
        accent: 0xfff2ad
      }
    };
  }

  return {
    tier,
    powerScore: modeScore,
    cooldownMs: 1500,
    label: 'Dragging',
    palette: {
      fill: 0x3d1319,
      glow: 0xff5a6b,
      accent: 0xffb1b8
    }
  };
}
