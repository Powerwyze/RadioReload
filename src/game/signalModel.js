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

function getTier(modeId, metrics) {
  const baseSignal = getBaseSignal(modeId, metrics);

  if (modeId === 'spectral-flux') {
    if (baseSignal < 0.008) {
      return 'red';
    }
    return baseSignal >= 0.04 ? 'green' : 'yellow';
  }

  if (modeId === 'low-end-energy') {
    if (baseSignal < 0.005) {
      return 'red';
    }
    return baseSignal >= 0.025 ? 'green' : 'yellow';
  }

  if (baseSignal < 0.015) {
    return 'red';
  }

  return baseSignal >= 0.06 ? 'green' : 'yellow';
}

export function getSignalDebug(modeId, metrics) {
  const modeScore = getBaseSignal(modeId, metrics);

  if (modeId === 'spectral-flux') {
    return {
      reason: modeScore >= 0.04 ? 'direct flux high' : modeScore < 0.008 ? 'direct flux low' : 'direct flux',
      modeScore
    };
  }

  if (modeId === 'low-end-energy') {
    return {
      reason: modeScore >= 0.025 ? 'direct bass high' : modeScore < 0.005 ? 'direct bass low' : 'direct bass',
      modeScore
    };
  }

  return {
    reason: modeScore >= 0.06 ? 'direct composite high' : modeScore < 0.015 ? 'direct composite low' : 'direct composite',
    modeScore
  };
}

export function getModeScore(modeId, metrics) {
  return getBaseSignal(modeId, metrics);
}

export function getActivityTier(modeId, metrics) {
  return getTier(modeId, metrics);
}

export function getCadenceProfile(modeId, metrics) {
  const tier = getTier(modeId, metrics);
  const modeScore = getBaseSignal(modeId, metrics);

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
