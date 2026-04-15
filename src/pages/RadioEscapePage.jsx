import React, { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { RadioEscapeScene } from '../game/createRadioEscapeScene';
import { MAZE_ROWS, TILE_SIZE } from '../game/maze';
import {
  DEFAULT_POWER_MODE,
  POWER_MODE_OPTIONS,
  getPowerMode
} from '../game/powerModes';
import { createRadioAudioController } from '../game/useRadioAudio';
import { RADIO_STATIONS } from '../game/radioStations';

const GAME_WIDTH = MAZE_ROWS[0].length * TILE_SIZE;
const GAME_HEIGHT = MAZE_ROWS.length * TILE_SIZE;
const CADENCE_WINDOWS = [
  {
    label: 'Rapid',
    colorName: 'Neon Green',
    colorHex: '#56ff8a',
    shotGapMs: 145
  },
  {
    label: 'Normal',
    colorName: 'Yellow',
    colorHex: '#ffd54a',
    shotGapMs: 630
  },
  {
    label: 'Dragging',
    colorName: 'Red',
    colorHex: '#ff5a6b',
    shotGapMs: 1500
  }
];

function createInitialHud(powerModeId = DEFAULT_POWER_MODE) {
  const powerMode = getPowerMode(powerModeId);
  const openingStation = RADIO_STATIONS[0];

  return {
    stationName: openingStation?.name ?? 'Loading station',
    stationTagline: openingStation?.tagline ?? 'Live station preview is standing by.',
    broadcastMode: 'ads',
    powerMode: powerMode.id,
    powerModeTitle: powerMode.title,
    powerScore: 0,
    activityTier: 'red',
    activityReason: 'silence gate',
    gameMode: 'arcade',
    paused: false,
    pulseLocked: false,
    pulseBpm: 0,
    smoothedPulseBpm: 0,
    confidence: 0,
    pulseStrength: 0,
    onsetDensity: 0,
    spectralFlux: 0,
    lowEndEnergy: 0,
    rms: 0,
    zeroCrossingRate: 0,
    speechBandRatio: 0,
    signalState: 'silence',
    shotProfileLabel: 'Dragging',
    shotCooldownMs: 1500,
    segmentRemaining: 0,
    score: 0,
    recordsCollected: 0,
    kills: 0,
    ammo: 25,
    aggressionLevel: 0,
    recordsToWin: 10,
    killsToWin: 30,
    statusText: `Choose ${powerMode.title.toLowerCase()} and the menu will preview the station feed.`,
    canShoot: false
  };
}

function syncMenuHud(previousHud, powerModeId, phase, gameMode) {
  const powerMode = getPowerMode(powerModeId);
  const signalLabel =
    previousHud.signalState === 'music'
      ? 'music'
      : previousHud.signalState === 'speech'
        ? 'speech'
        : 'silence';

  return {
    ...previousHud,
    powerMode: powerMode.id,
    powerModeTitle: powerMode.title,
    gameMode,
    paused: false,
    canShoot: false,
    statusText:
      phase === 'game-over'
        ? `Previewing ${previousHud.stationName} from your last run. Current read is ${signalLabel}. Pick ${powerMode.title.toLowerCase()} and restart when ready.`
        : `Choose ${powerMode.title.toLowerCase()} and the menu will preview the station feed.`
  };
}

function RadioEscapePage() {
  const gameHostRef = useRef(null);
  const gameStageRef = useRef(null);
  const menuOverlayRef = useRef(null);
  const menuCardRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const audioRef = useRef(null);

  const [selectedPowerMode, setSelectedPowerMode] = useState(DEFAULT_POWER_MODE);
  const [selectedSessionMode, setSelectedSessionMode] = useState('arcade');
  const [sessionId, setSessionId] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [hud, setHud] = useState(() => createInitialHud(DEFAULT_POWER_MODE));
  const [gameOverReason, setGameOverReason] = useState('The crowd caught you.');
  const [canvasSize, setCanvasSize] = useState({
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  });
  const [menuFit, setMenuFit] = useState({
    scale: 1,
    width: 0,
    height: 0
  });

  useEffect(() => {
    audioRef.current = createRadioAudioController({
      onPulse: (nextState) => {
        sceneRef.current?.setPulseState(nextState);
      }
    });

    return () => {
      audioRef.current?.destroy();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase === 'running') {
      return;
    }

    setHud((currentHud) => syncMenuHud(currentHud, selectedPowerMode, phase, selectedSessionMode));
  }, [phase, selectedPowerMode, selectedSessionMode]);

  useEffect(() => {
    if (!sessionId || !gameHostRef.current) {
      return undefined;
    }

    const scene = new RadioEscapeScene({
      analysisMode: selectedPowerMode,
      gameMode: selectedSessionMode,
      onHudChange: (nextHud) => {
        startTransition(() => {
          setHud(nextHud);
        });
      },
      onPauseChange: (paused) => {
        startTransition(() => {
          setHud((currentHud) => ({
            ...currentHud,
            paused
          }));
        });
      },
      onGameOver: (reason) => {
        setPhase('game-over');
        setGameOverReason(reason);
      }
    });

    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameHostRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#07090f',
      render: {
        antialias: false,
        pixelArt: false
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade'
      },
      scene: [scene]
    });

    gameRef.current = game;

    return () => {
      sceneRef.current = null;
      gameRef.current = null;
      game.destroy(true);
    };
  }, [sessionId, selectedPowerMode, selectedSessionMode]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.setBroadcast(hud.stationName);
    audioRef.current.resume();
  }, [hud.stationName, phase]);

  useEffect(() => {
    if (!audioRef.current) {
      return undefined;
    }

    const unlockPreview = () => {
      audioRef.current?.setBroadcast(hud.stationName);
      audioRef.current?.resume();
    };

    window.addEventListener('pointerdown', unlockPreview);
    window.addEventListener('keydown', unlockPreview);

    return () => {
      window.removeEventListener('pointerdown', unlockPreview);
      window.removeEventListener('keydown', unlockPreview);
    };
  }, [hud.stationName]);

  useLayoutEffect(() => {
    if (!gameStageRef.current) {
      return undefined;
    }

    function fitCanvas() {
      const stage = gameStageRef.current;
      if (!stage) {
        return;
      }

      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }

      const scale = Math.min(bounds.width / GAME_WIDTH, bounds.height / GAME_HEIGHT);
      const nextWidth = Math.max(1, Math.floor(GAME_WIDTH * scale));
      const nextHeight = Math.max(1, Math.floor(GAME_HEIGHT * scale));

      setCanvasSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight
        };
      });
    }

    fitCanvas();
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(gameStageRef.current);
    window.addEventListener('resize', fitCanvas);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fitCanvas);
    };
  }, [phase]);

  useLayoutEffect(() => {
    if (phase === 'running' || !menuOverlayRef.current || !menuCardRef.current) {
      setMenuFit({
        scale: 1,
        width: 0,
        height: 0
      });
      return undefined;
    }

    function fitMenu() {
      const overlay = menuOverlayRef.current;
      const card = menuCardRef.current;
      if (!overlay || !card) {
        return;
      }

      const availableWidth = Math.max(overlay.clientWidth - 24, 1);
      const availableHeight = Math.max(overlay.clientHeight - 24, 1);
      const naturalWidth = Math.max(card.scrollWidth, 1);
      const naturalHeight = Math.max(card.scrollHeight, 1);
      const nextScale = Math.min(
        1,
        availableWidth / naturalWidth,
        availableHeight / naturalHeight
      );

      const nextWidth = Math.ceil(naturalWidth * nextScale);
      const nextHeight = Math.ceil(naturalHeight * nextScale);

      setMenuFit((current) => {
        if (
          Math.abs(current.scale - nextScale) < 0.01 &&
          current.width === nextWidth &&
          current.height === nextHeight
        ) {
          return current;
        }

        return {
          scale: nextScale,
          width: nextWidth,
          height: nextHeight
        };
      });
    }

    fitMenu();
    const overlayObserver = new ResizeObserver(fitMenu);
    overlayObserver.observe(menuOverlayRef.current);
    window.addEventListener('resize', fitMenu);

    return () => {
      overlayObserver.disconnect();
      window.removeEventListener('resize', fitMenu);
    };
  }, [phase, selectedPowerMode, gameOverReason]);

  function startRun(gameMode = selectedSessionMode) {
    audioRef.current?.resume();
    setSelectedSessionMode(gameMode);
    setHud({
      ...createInitialHud(selectedPowerMode),
      gameMode
    });
    setGameOverReason('The crowd caught you.');
    setPhase('running');
    setSessionId((current) => current + 1);
  }

  function resumeRun() {
    sceneRef.current?.setPaused(false);
  }

  function returnHome() {
    sceneRef.current?.setPaused(false);
    setPhase('idle');
    setHud((currentHud) => syncMenuHud(currentHud, selectedPowerMode, 'idle', selectedSessionMode));
  }

  const phaseClass = phase === 'running' ? 'running-phase' : 'menu-phase';

  return (
    <main className={`radio-page ${phaseClass}`}>
      <header className="page-top">
        <p className="radio-kicker">Arcade Prototype</p>
        <h1>Radio Reload: Dead Air Run</h1>
        <p className="radio-lead">
          Pick a power reader before the run starts. The live stream can now arm
          the weapon with a composite rhythm model, pure spectral motion, or raw
          low-end punch while bullet speed stays fast in every mode.
        </p>
      </header>

      <section className="radio-hero">
        <div className="radio-summary">
          <div>
            <span>Current Signal</span>
            <strong className={hud.broadcastMode}>
              {hud.signalState === 'music'
                ? 'Music'
                : hud.signalState === 'speech'
                  ? 'Speech'
                  : 'Silence'}
            </strong>
          </div>
          <div>
            <span>Power Mode</span>
            <strong>{hud.powerModeTitle}</strong>
          </div>
          <div>
            <span>Records Flipped</span>
            <strong>{hud.recordsCollected}/{hud.recordsToWin}</strong>
          </div>
          <div>
            <span>Bad Guys Dropped</span>
            <strong>{hud.kills}/{hud.killsToWin}</strong>
          </div>
          <div>
            <span>Ammo</span>
            <strong>{hud.ammo}</strong>
          </div>
        </div>

        <div className="hero-note">
          <p className="panel-chip">Core Loop</p>
          <p>
            Build power from the live signal, keep lanes open, and use record
            pickups to flip stations until the reader you chose starts feeding
            the gun.
          </p>
        </div>
      </section>

      <section className="radio-layout">
        <div className="arena-panel">
          <div className="arena-header">
            <div>
              <p className="panel-chip">Playfield</p>
              <h2>Dead Air Run</h2>
            </div>
            <button
              className="arcade-button"
              onClick={() => startRun(selectedSessionMode)}
              type="button"
            >
              {phase === 'running'
                ? selectedSessionMode === 'test-lab'
                  ? 'Restart Test Lab'
                  : 'Restart Run'
                : phase === 'game-over'
                  ? selectedSessionMode === 'test-lab'
                    ? 'Test Again'
                    : 'Run Again'
                  : selectedSessionMode === 'test-lab'
                    ? 'Start Test Lab'
                    : 'Start Broadcast'}
            </button>
          </div>

          <div className="game-stage" ref={gameStageRef}>
            <div
              className="game-canvas-shell"
              ref={gameHostRef}
              style={{
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`
              }}
            />

            {phase !== 'running' || hud.paused ? (
              <div className="game-overlay" ref={menuOverlayRef}>
                <div
                  className="menu-scale-shell"
                  style={{
                    width: menuFit.width ? `${menuFit.width}px` : undefined,
                    height: menuFit.height ? `${menuFit.height}px` : undefined
                  }}
                >
                  <div
                    className="overlay-card menu-card"
                    ref={menuCardRef}
                    style={{
                      transform: `scale(${menuFit.scale})`,
                      transformOrigin: 'top left'
                    }}
                  >
                    <p className="panel-chip">
                      {phase === 'game-over' ? 'Game Over' : hud.paused ? 'Paused' : 'Start Menu'}
                    </p>
                    <h3>
                      {phase === 'game-over'
                        ? gameOverReason
                        : hud.paused
                          ? 'Broadcast paused.'
                          : 'Choose the signal reader that powers the gun.'}
                    </h3>
                    <p>
                      {phase === 'game-over'
                        ? 'Switch the reader if you want a different feel, then restart the run.'
                        : hud.paused
                          ? 'Press Esc again or use Resume to jump back into the station.'
                          : 'Move with WASD or arrows. Press Space to shoot. Slow power means fewer shots, but bullets always fly fast.'}
                    </p>

                    {!hud.paused ? (
                      <>
                        <div className="mode-grid">
                          {POWER_MODE_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              className={`mode-option ${selectedPowerMode === option.id ? 'selected' : ''}`}
                              onClick={() => setSelectedPowerMode(option.id)}
                              type="button"
                            >
                              <span className="mode-option-index">
                                {POWER_MODE_OPTIONS.findIndex((entry) => entry.id === option.id) + 1}
                              </span>
                              <strong>{option.title}</strong>
                              <p>{option.description}</p>
                            </button>
                          ))}
                        </div>

                        <div className="mode-grid session-grid">
                          <button
                            className={`mode-option ${selectedSessionMode === 'arcade' ? 'selected' : ''}`}
                            onClick={() => setSelectedSessionMode('arcade')}
                            type="button"
                          >
                            <span className="mode-option-index">A</span>
                            <strong>Arcade Run</strong>
                            <p>Normal run with enemies, pickups, and game over pressure.</p>
                          </button>
                          <button
                            className={`mode-option ${selectedSessionMode === 'test-lab' ? 'selected' : ''}`}
                            onClick={() => setSelectedSessionMode('test-lab')}
                            type="button"
                          >
                            <span className="mode-option-index">T</span>
                            <strong>Test Lab</strong>
                            <p>No enemies. Walk the map, listen, shoot, and press R to retune stations.</p>
                          </button>
                        </div>

                        <div className="cadence-windows" aria-label="Cadence preview">
                          {CADENCE_WINDOWS.map((window) => (
                            <article
                              className="cadence-window"
                              key={window.label}
                              style={{
                                '--cadence-color': window.colorHex,
                                '--cadence-speed': `${window.shotGapMs}ms`
                              }}
                            >
                              <p className="panel-chip">Cadence Window</p>
                              <strong>{window.label}</strong>
                              <div className="cadence-window-preview" aria-hidden="true">
                                <div className="cadence-window-wall cadence-window-wall-left" />
                                <div className="cadence-window-wall cadence-window-wall-right" />
                                <div className="cadence-window-floor" />
                                <div className="cadence-window-bullets">
                                  <span className="cadence-window-bullet cadence-window-bullet-a" />
                                  <span className="cadence-window-bullet cadence-window-bullet-b" />
                                  <span className="cadence-window-bullet cadence-window-bullet-c" />
                                </div>
                                <div className="cadence-window-hero">
                                  <span className="cadence-window-shadow" />
                                  <span className="cadence-window-legs" />
                                  <span className="cadence-window-body" />
                                  <span className="cadence-window-head" />
                                  <span className="cadence-window-arm" />
                                  <span className="cadence-window-gun" />
                                  <span className="cadence-window-flash" />
                                </div>
                                <div className="cadence-window-target" />
                              </div>
                              <div className="cadence-window-color">
                                <span
                                  className="cadence-window-swatch"
                                  style={{ backgroundColor: window.colorHex }}
                                />
                                <span>{window.colorName}</span>
                              </div>
                              <p>{window.shotGapMs}ms shot gap</p>
                            </article>
                          ))}
                        </div>
                      </>
                    ) : null}

                    <div className="menu-actions">
                      {hud.paused ? (
                        <>
                          <button className="arcade-button" onClick={resumeRun} type="button">
                            Resume
                          </button>
                          <button className="arcade-button alt" onClick={returnHome} type="button">
                            Return Home
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="arcade-button"
                            onClick={() => startRun('arcade')}
                            type="button"
                          >
                            {phase === 'game-over' ? 'Restart Arcade' : 'Start Arcade'}
                          </button>
                          <button
                            className="arcade-button alt"
                            onClick={() => startRun('test-lab')}
                            type="button"
                          >
                            {phase === 'game-over' ? 'Restart Test Lab' : 'Open Test Lab'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="broadcast-panel">
          <section className="broadcast-card">
            <p className="panel-chip">On Air</p>
            <h3>{hud.stationName}</h3>
            <p className="broadcast-tagline">{hud.stationTagline}</p>
            <div className={`broadcast-mode ${hud.broadcastMode}`}>
              <span>{hud.powerModeTitle} / {hud.gameMode === 'test-lab' ? 'Test Lab' : 'Arcade'}</span>
              <strong>{hud.shotProfileLabel} fire</strong>
            </div>
            <p className="status-copy">
              Signal state: {hud.signalState} / tier: {hud.activityTier}
            </p>
            <p className="status-copy">
              Trigger: {hud.activityReason}
            </p>
            <p className="status-copy">{hud.statusText}</p>
            <p className="status-copy">
              Tempo: {hud.smoothedPulseBpm > 0 ? `about ${hud.smoothedPulseBpm} BPM` : 'still reading'}
            </p>
            <div className="pulse-meter" aria-label="Power meter">
              <div className="pulse-meter-track">
                <div
                  className={`pulse-meter-fill ${hud.broadcastMode === 'music' ? 'locked' : ''}`}
                  style={{ width: `${Math.max(8, Math.round(hud.powerScore * 100))}%` }}
                />
              </div>
              <div className="pulse-meter-labels">
                <span>Power score</span>
                <strong>{Math.round(hud.powerScore * 100)}%</strong>
              </div>
            </div>
          </section>

          <section className="broadcast-card metrics">
            <div>
              <span>Score</span>
              <strong>{hud.score}</strong>
            </div>
            <div>
              <span>Ammo</span>
              <strong>{hud.ammo}</strong>
            </div>
            <div>
              <span>Weapon</span>
              <strong>{hud.shotProfileLabel}</strong>
            </div>
            <div>
              <span>Shot Gap</span>
              <strong>{Math.round(hud.shotCooldownMs)}ms</strong>
            </div>
            <div>
              <span>Tier</span>
              <strong>{hud.activityTier}</strong>
            </div>
            <div>
              <span>Trigger</span>
              <strong>{hud.activityReason}</strong>
            </div>
            <div>
              <span>Power Mode</span>
              <strong>{hud.powerModeTitle}</strong>
            </div>
            <div>
              <span>Spectral Flux</span>
              <strong>{Math.round(hud.spectralFlux * 100)}%</strong>
            </div>
            <div>
              <span>Low-End</span>
              <strong>{Math.round(hud.lowEndEnergy * 100)}%</strong>
            </div>
            <div>
              <span>Onset Density</span>
              <strong>{Math.round(hud.onsetDensity * 100)}%</strong>
            </div>
            <div>
              <span>Pulse Confidence</span>
              <strong>{Math.round(hud.confidence * 100)}%</strong>
            </div>
            <div>
              <span>RMS</span>
              <strong>{Math.round(hud.rms * 100)}%</strong>
            </div>
            <div>
              <span>ZCR</span>
              <strong>{Math.round(hud.zeroCrossingRate * 100)}%</strong>
            </div>
            <div>
              <span>Speech Band</span>
              <strong>{Math.round(hud.speechBandRatio * 100)}%</strong>
            </div>
            <div>
              <span>Signal State</span>
              <strong>{hud.signalState}</strong>
            </div>
            <div>
              <span>Aggression</span>
              <strong>Lv {hud.aggressionLevel}</strong>
            </div>
            <div>
              <span>Win Target</span>
              <strong>{hud.killsToWin} kills / {hud.recordsToWin} records</strong>
            </div>
          </section>

          <section className="broadcast-card">
            <p className="panel-chip">Rules</p>
            <ul className="rule-list">
              <li>Power score changes shot cadence, not bullet speed.</li>
              <li>Red means silence or non-music, yellow means normal music, green means strong music energy.</li>
              <li>You start with 25 bullets. Each record adds 15 ammo. Some bad guys drop 5 ammo.</li>
              <li>Win by collecting 10 records or dropping 30 bad guys.</li>
              <li>Every 5 kills raises enemy aggression and speeds them up.</li>
              <li>Composite Drive blends pulse confidence, onset density, and spectral flux.</li>
              <li>Flux Drive follows motion across the spectrum.</li>
              <li>Bass Drive follows low-end kick and bass weight.</li>
              <li>Arcade mode uses enemies and record pickups. Test Lab has no enemies and uses R to retune.</li>
              <li>One touch from a bad guy ends the run.</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default RadioEscapePage;
