import { createRealtimeBpmAnalyzer } from 'realtime-bpm-analyzer';
import { RADIO_STATIONS } from './radioStations';

const EMIT_INTERVAL_MS = 220;
const PULSE_STALE_MS = 4200;
const STABLE_GRACE_MS = 3600;
const METRIC_WINDOW_MS = 2600;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getStation(stationName) {
  return RADIO_STATIONS.find((station) => station.name === stationName) ?? RADIO_STATIONS[0];
}

function getLeadTempo(data) {
  return data?.bpm?.[0] ?? null;
}

function getSignalState({
  rms,
  spectralFlux,
  lowEndEnergy,
  speechBandRatio,
  pulseStrength,
  confidence,
  onsetDensity
}) {
  const effectivelySilent =
    rms < 0.012 &&
    spectralFlux < 0.05 &&
    lowEndEnergy < 0.04 &&
    onsetDensity < 0.05;

  if (effectivelySilent) {
    return 'silence';
  }

  const clearlyMusical =
    pulseStrength >= 0.24 ||
    confidence >= 0.34 ||
    onsetDensity >= 0.18 ||
    spectralFlux >= 0.16 ||
    lowEndEnergy >= 0.1 ||
    (onsetDensity >= 0.14 && lowEndEnergy >= 0.08) ||
    (spectralFlux >= 0.14 && lowEndEnergy >= 0.09);

  if (clearlyMusical) {
    return 'music';
  }

  const likelySpeech =
    speechBandRatio >= 0.4 &&
    lowEndEnergy < 0.12 &&
    pulseStrength < 0.22 &&
    confidence < 0.3;

  if (likelySpeech) {
    return 'speech';
  }

  return spectralFlux >= 0.12 || lowEndEnergy >= 0.08 || onsetDensity >= 0.12
    ? 'music'
    : 'speech';
}

export function createRadioAudioController(callbacks = {}) {
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.85;
  audio.playsInline = true;
  audio.crossOrigin = 'anonymous';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const analysisContext = AudioContextClass ? new AudioContextClass() : null;
  const analysisState = {
    source: null,
    outputConnected: false,
    metricsAnalyser: null,
    metricsData: null,
    previousMetricsData: null,
    timeData: null,
    analyzer: null,
    analyzerReady: null,
    heartbeatId: null,
    metricsFrameId: null,
    lastEmitAt: 0,
    lastTempoAt: 0,
    lastStableAt: 0,
    lastOnsetAt: 0,
    onsetTimes: [],
    onsetDensity: 0,
    spectralFlux: 0,
    lowEndEnergy: 0,
    rms: 0,
    zeroCrossingRate: 0,
    speechBandRatio: 0,
    fluxBaseline: 0,
    signalState: 'silence',
    steadyPulse: false,
    bpm: 0,
    confidence: 0,
    pulseStrength: 0
  };

  let isEnabled = false;
  let activeStationName = RADIO_STATIONS[0]?.name ?? '';

  // Blocked (CORS / mixed content) or offline streams fail here instead of playing silence.
  audio.addEventListener('error', () => {
    if (!isEnabled || !audio.getAttribute('src')) {
      return;
    }

    callbacks.onStationFailed?.(activeStationName);
  });

  function emitPulse(nextState) {
    callbacks.onPulse?.(nextState);
  }

  function pushPulseState(now = performance.now(), force = false) {
    if (!force && now - analysisState.lastEmitAt < EMIT_INTERVAL_MS) {
      return;
    }

    analysisState.lastEmitAt = now;
    emitPulse({
      stationName: activeStationName,
      steadyPulse: analysisState.steadyPulse,
      bpm: analysisState.bpm,
      confidence: Number(analysisState.confidence.toFixed(2)),
      pulseStrength: Number(analysisState.pulseStrength.toFixed(2)),
      onsetDensity: Number(analysisState.onsetDensity.toFixed(2)),
      spectralFlux: Number(analysisState.spectralFlux.toFixed(2)),
      lowEndEnergy: Number(analysisState.lowEndEnergy.toFixed(2)),
      rms: Number(analysisState.rms.toFixed(3)),
      zeroCrossingRate: Number(analysisState.zeroCrossingRate.toFixed(3)),
      speechBandRatio: Number(analysisState.speechBandRatio.toFixed(2)),
      signalState: analysisState.signalState
    });
  }

  function resetPulseState(force = true) {
    analysisState.lastEmitAt = 0;
    analysisState.lastTempoAt = 0;
    analysisState.lastStableAt = 0;
    analysisState.lastOnsetAt = 0;
    analysisState.onsetTimes = [];
    analysisState.onsetDensity = 0;
    analysisState.spectralFlux = 0;
    analysisState.lowEndEnergy = 0;
    analysisState.rms = 0;
    analysisState.zeroCrossingRate = 0;
    analysisState.speechBandRatio = 0;
    analysisState.fluxBaseline = 0;
    analysisState.signalState = 'silence';
    analysisState.steadyPulse = false;
    analysisState.bpm = 0;
    analysisState.confidence = 0;
    analysisState.pulseStrength = 0;
    pushPulseState(performance.now(), force);
  }

  function stopMetricsMonitor() {
    if (analysisState.metricsFrameId) {
      window.cancelAnimationFrame(analysisState.metricsFrameId);
      analysisState.metricsFrameId = null;
    }
  }

  function stopHealthMonitor() {
    if (analysisState.heartbeatId) {
      window.clearInterval(analysisState.heartbeatId);
      analysisState.heartbeatId = null;
    }
  }

  function startHealthMonitor() {
    if (analysisState.heartbeatId) {
      return;
    }

    analysisState.heartbeatId = window.setInterval(() => {
      const now = performance.now();

      if (!isEnabled || audio.paused) {
        if (analysisState.steadyPulse || analysisState.bpm || analysisState.pulseStrength) {
          resetPulseState(true);
        }
        return;
      }

      const quietFor = now - analysisState.lastTempoAt;
      if (quietFor <= PULSE_STALE_MS) {
        const recentStable = now - analysisState.lastStableAt <= STABLE_GRACE_MS;
        if (!recentStable && analysisState.confidence < 0.55) {
          analysisState.steadyPulse = false;
        }
        pushPulseState(now);
        return;
      }

      analysisState.steadyPulse = false;
      analysisState.bpm = Math.round(analysisState.bpm * 0.92);
      analysisState.confidence *= 0.78;
      analysisState.pulseStrength *= 0.82;
      analysisState.onsetDensity *= 0.8;
      analysisState.spectralFlux *= 0.78;
      analysisState.lowEndEnergy *= 0.82;
      analysisState.rms *= 0.74;
      analysisState.zeroCrossingRate *= 0.8;
      analysisState.speechBandRatio *= 0.82;
      if (analysisState.pulseStrength < 0.03) {
        analysisState.bpm = 0;
        analysisState.confidence = 0;
        analysisState.pulseStrength = 0;
      }
      analysisState.signalState = getSignalState(analysisState);
      pushPulseState(now, analysisState.pulseStrength === 0);
    }, 250);
  }

  function startMetricsMonitor() {
    if (!analysisState.metricsAnalyser || analysisState.metricsFrameId) {
      return;
    }

    const tick = () => {
      if (!isEnabled || audio.paused || !analysisState.metricsAnalyser || !analysisState.metricsData) {
        analysisState.metricsFrameId = null;
        return;
      }

      const now = performance.now();
      analysisState.metricsAnalyser.getByteFrequencyData(analysisState.metricsData);
      analysisState.metricsAnalyser.getByteTimeDomainData(analysisState.timeData);

      const currentData = analysisState.metricsData;
      const previousData = analysisState.previousMetricsData;
      const timeData = analysisState.timeData;
      let positiveDelta = 0;

      for (let index = 0; index < currentData.length; index += 1) {
        const diff = currentData[index] - previousData[index];
        if (diff > 0) {
          positiveDelta += diff;
        }
        previousData[index] = currentData[index];
      }

      const binHz = analysisContext.sampleRate / analysisState.metricsAnalyser.fftSize;
      const lowBandEnd = Math.min(
        currentData.length,
        Math.max(2, Math.ceil(180 / binHz))
      );
      const speechBandStart = Math.min(
        currentData.length,
        Math.max(1, Math.floor(300 / binHz))
      );
      const speechBandEnd = Math.min(
        currentData.length,
        Math.max(speechBandStart + 1, Math.ceil(3400 / binHz))
      );

      let lowEnergySum = 0;
      let totalEnergySum = 0;
      let speechEnergySum = 0;
      for (let index = 0; index < lowBandEnd; index += 1) {
        lowEnergySum += currentData[index];
      }
      for (let index = 0; index < currentData.length; index += 1) {
        totalEnergySum += currentData[index];
        if (index >= speechBandStart && index < speechBandEnd) {
          speechEnergySum += currentData[index];
        }
      }

      let sumSquares = 0;
      let zeroCrossings = 0;
      let previousSample = (timeData[0] - 128) / 128;
      for (let index = 0; index < timeData.length; index += 1) {
        const sample = (timeData[index] - 128) / 128;
        sumSquares += sample * sample;
        if (
          index > 0 &&
          ((sample >= 0 && previousSample < 0) || (sample < 0 && previousSample >= 0))
        ) {
          zeroCrossings += 1;
        }
        previousSample = sample;
      }

      const rawFlux = clamp(positiveDelta / (currentData.length * 22), 0, 1);
      const lowEndEnergy = clamp((lowEnergySum / Math.max(lowBandEnd, 1)) / 255, 0, 1);
      const speechBandRatio = clamp(speechEnergySum / Math.max(totalEnergySum, 1), 0, 1);
      const rms = clamp(Math.sqrt(sumSquares / Math.max(timeData.length, 1)), 0, 1);
      const zeroCrossingRate = clamp(zeroCrossings / Math.max(timeData.length - 1, 1), 0, 1);
      analysisState.fluxBaseline = smoothMetric(analysisState.fluxBaseline, rawFlux, 0.1);

      if (
        rawFlux > Math.max(0.16, analysisState.fluxBaseline * 1.35) &&
        now - analysisState.lastOnsetAt > 130
      ) {
        analysisState.lastOnsetAt = now;
        analysisState.onsetTimes.push(now);
      }

      analysisState.onsetTimes = analysisState.onsetTimes.filter(
        (time) => now - time <= METRIC_WINDOW_MS
      );

      const onsetDensity = clamp(analysisState.onsetTimes.length / 10, 0, 1);
      analysisState.spectralFlux = smoothMetric(analysisState.spectralFlux, rawFlux, 0.28);
      analysisState.lowEndEnergy = smoothMetric(analysisState.lowEndEnergy, lowEndEnergy, 0.24);
      analysisState.onsetDensity = smoothMetric(analysisState.onsetDensity, onsetDensity, 0.26);
      analysisState.rms = smoothMetric(analysisState.rms, rms, 0.22);
      analysisState.zeroCrossingRate = smoothMetric(
        analysisState.zeroCrossingRate,
        zeroCrossingRate,
        0.24
      );
      analysisState.speechBandRatio = smoothMetric(
        analysisState.speechBandRatio,
        speechBandRatio,
        0.24
      );
      analysisState.signalState = getSignalState(analysisState);
      pushPulseState(now);

      analysisState.metricsFrameId = window.requestAnimationFrame(tick);
    };

    analysisState.metricsFrameId = window.requestAnimationFrame(tick);
  }

  function smoothMetric(current, target, factor) {
    return current + (target - current) * factor;
  }

  function updateFromCandidate(data, { stable = false } = {}) {
    const candidate = getLeadTempo(data);
    if (!candidate) {
      return;
    }

    const now = performance.now();
    const bpm = Math.round(candidate.tempo ?? 0);
    const confidence = clamp(candidate.confidence ?? 0, 0, 1);
    const count = Math.max(0, candidate.count ?? 0);
    const countStrength = clamp(count / 20, 0, 1);
    const pulseStrength = stable
      ? Math.max(confidence, 0.84)
      : Math.max(confidence * 0.88, countStrength * 0.7);

    analysisState.lastTempoAt = now;
    if (stable) {
      analysisState.lastStableAt = now;
    }

    const recentStable = now - analysisState.lastStableAt <= STABLE_GRACE_MS;
    analysisState.steadyPulse = stable || recentStable || (confidence >= 0.6 && count >= 4);
    analysisState.bpm = bpm;
    analysisState.confidence = confidence;
    analysisState.pulseStrength = pulseStrength;
    pushPulseState(now, stable);
  }

  async function ensureAnalysisGraph() {
    if (!analysisContext) {
      return null;
    }

    if (analysisState.analyzerReady) {
      return analysisState.analyzerReady;
    }

    analysisState.analyzerReady = (async () => {
      if (!analysisState.source) {
        analysisState.source = analysisContext.createMediaElementSource(audio);
      }
      if (!analysisState.metricsAnalyser) {
        analysisState.metricsAnalyser = analysisContext.createAnalyser();
        analysisState.metricsAnalyser.fftSize = 1024;
        analysisState.metricsAnalyser.smoothingTimeConstant = 0.35;
        analysisState.metricsData = new Uint8Array(analysisState.metricsAnalyser.frequencyBinCount);
        analysisState.previousMetricsData = new Uint8Array(analysisState.metricsAnalyser.frequencyBinCount);
        analysisState.timeData = new Uint8Array(analysisState.metricsAnalyser.fftSize);
      }

      const analyzer = await createRealtimeBpmAnalyzer(analysisContext, {
        continuousAnalysis: true,
        stabilizationTime: 12000,
        muteTimeInIndexes: 10000
      });

      analyzer.on('bpm', (data) => {
        updateFromCandidate(data);
      });

      analyzer.on('bpmStable', (data) => {
        updateFromCandidate(data, { stable: true });
      });

      analyzer.on('analyzerReset', () => {
        analysisState.lastStableAt = 0;
      });

      analyzer.on('error', () => {
        analysisState.steadyPulse = false;
        analysisState.bpm = 0;
        analysisState.confidence = 0;
        analysisState.pulseStrength *= 0.5;
        pushPulseState(performance.now(), true);
      });

      if (!analysisState.outputConnected) {
        analysisState.source.connect(analysisContext.destination);
        analysisState.outputConnected = true;
      }
      analysisState.source.connect(analysisState.metricsAnalyser);
      analysisState.source.connect(analyzer.node);
      analysisState.analyzer = analyzer;
      return analyzer;
    })().catch((error) => {
      analysisState.analyzerReady = null;
      throw error;
    });

    return analysisState.analyzerReady;
  }

  async function syncPlayback() {
    if (!isEnabled) {
      audio.pause();
      stopHealthMonitor();
      resetPulseState(true);
      return;
    }

    const station = getStation(activeStationName);
    if (!station?.streamUrl) {
      audio.pause();
      stopHealthMonitor();
      resetPulseState(true);
      return;
    }

    try {
      if (analysisContext?.state === 'suspended') {
        await analysisContext.resume();
      }

      const analyzer = await ensureAnalysisGraph();
      const isNewSource = audio.src !== station.streamUrl;

      if (isNewSource) {
        audio.pause();
        resetPulseState(true);
        analyzer?.reset();
        audio.src = station.streamUrl;
        audio.load();
      } else if (!audio.src) {
        audio.src = station.streamUrl;
        audio.load();
      }

      startHealthMonitor();
      startMetricsMonitor();
      await audio.play();
    } catch {
      // Browser autoplay restrictions or unsupported worklets can still block playback.
    }
  }

  return {
    async resume() {
      isEnabled = true;
      await syncPlayback();
    },

    async setBroadcast(stationName) {
      activeStationName = stationName;
      await syncPlayback();
    },

    stop() {
      isEnabled = false;
      audio.pause();
      analysisState.analyzer?.reset();
      stopMetricsMonitor();
      stopHealthMonitor();
      resetPulseState(true);
    },

    destroy() {
      isEnabled = false;
      audio.pause();
      analysisState.analyzer?.disconnect();
      analysisState.source?.disconnect();
      stopMetricsMonitor();
      stopHealthMonitor();
      resetPulseState(false);
      analysisContext?.close();
      audio.removeAttribute('src');
      audio.load();
    }
  };
}
