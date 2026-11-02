import React, { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Cutscene } from '../components/Cutscene';
import { PanelCanvas, PixelSprite } from '../components/PixelArt';
import { TIER_COLORS } from '../game/art/palette';
import { RadioEscapeScene } from '../game/createRadioEscapeScene';
import { FLOORS } from '../game/floors';
import { MAZE_COLS, MAZE_ROW_COUNT, TILE_SIZE } from '../game/maze';
import { RADIO_STATIONS } from '../game/radioStations';
import { ENDING_PANELS, GAME_OVER_LINES, HOW_TO_PLAY, INTRO_PANELS } from '../game/story';
import { createRadioAudioController } from '../game/useRadioAudio';

const GAME_WIDTH = MAZE_COLS * TILE_SIZE;
const GAME_HEIGHT = MAZE_ROW_COUNT * TILE_SIZE;
const BEST_KEY = 'radio-reload-best';
const INTRO_KEY = 'radio-reload-intro-seen';
const MUTE_KEY = 'radio-reload-muted';
const TIER_LABELS = {
  green: { name: 'Rapid', note: 'Bass is peaking' },
  yellow: { name: 'Normal', note: 'Bass is steady' },
  red: { name: 'Dragging', note: 'Bass is thin' }
};

function readStorage(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Private windows can refuse storage; the game works without it.
  }
}

function createInitialHud() {
  const openingStation = RADIO_STATIONS[0];
  return {
    stationName: openingStation?.name ?? 'Loading station',
    stationTagline: openingStation?.tagline ?? '',
    broadcastMode: 'ads',
    powerScore: 0,
    activityTier: 'red',
    activityReason: 'silence gate',
    gameMode: 'arcade',
    paused: false,
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
    score: 0,
    kills: 0,
    ammo: 25,
    hp: 3,
    maxHp: 3,
    aggressionLevel: 0,
    floorIndex: 0,
    floorCount: FLOORS.length,
    floorLabel: FLOORS[0].label,
    floorName: FLOORS[0].name,
    floorTheme: FLOORS[0].theme,
    floorObjective: FLOORS[0].objective,
    floorRecords: 0,
    recordsToOpen: FLOORS[0].recordsToOpen,
    recordsTotal: 0,
    elevatorOpen: false,
    engineHp: 0,
    engineMaxHp: 0,
    statusText: ''
  };
}

function signalLabel(state) {
  if (state === 'music') return 'Music';
  if (state === 'speech') return 'Talk';
  return 'Dead air';
}

// A pixel speaker: sound waves when live, an X when muted.
function SpeakerIcon({ muted }) {
  return (
    <svg aria-hidden="true" className="mute-icon" shapeRendering="crispEdges" viewBox="0 0 16 16">
      <path d="M1 6h3v4H1zM4 5h1v6H4zM5 4h1v8H5zM6 3h1v10H6zM7 2h1v12H7z" fill="currentColor" />
      {muted ? (
        <path d="M10 5h1v1h-1zM11 6h1v1h-1zM12 7h1v2h-1zM13 6h1v1h-1zM14 5h1v1h-1zM11 9h1v1h-1zM10 10h1v1h-1zM13 9h1v1h-1zM14 10h1v1h-1z" fill="currentColor" />
      ) : (
        <path d="M10 6h1v4h-1zM12 4h1v1h-1zM13 5h1v6h-1zM12 11h1v1h-1z" fill="currentColor" />
      )}
    </svg>
  );
}

function RadioEscapePage() {
  const gameHostRef = useRef(null);
  const gameStageRef = useRef(null);
  const sceneRef = useRef(null);
  const audioRef = useRef(null);

  const [screen, setScreen] = useState('title');
  const [session, setSession] = useState(null);
  const [hud, setHud] = useState(() => createInitialHud());
  const [floorCard, setFloorCard] = useState(null);
  const [runSummary, setRunSummary] = useState(null);
  const [best, setBest] = useState(() => Number(readStorage(BEST_KEY, 0)) || 0);
  const [introReturn, setIntroReturn] = useState('play');
  const [canvasSize, setCanvasSize] = useState({ width: GAME_WIDTH, height: GAME_HEIGHT });
  const [muted, setMuted] = useState(() => readStorage(MUTE_KEY, '') === 'yes');

  useEffect(() => {
    audioRef.current = createRadioAudioController({
      onPulse: (nextState) => {
        sceneRef.current?.setPulseState(nextState);
      },
      onStationFailed: (stationName) => {
        sceneRef.current?.handleStationFailure(stationName);
      }
    });

    return () => {
      audioRef.current?.destroy();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
    writeStorage(MUTE_KEY, muted ? 'yes' : 'no');
  }, [muted]);

  // M toggles mute on every screen.
  useEffect(() => {
    function onKey(event) {
      if (event.code === 'KeyM' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
        setMuted((value) => !value);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function recordScore(summary) {
    setRunSummary(summary);
    if (summary.score > best) {
      setBest(summary.score);
      writeStorage(BEST_KEY, summary.score);
    }
  }

  useEffect(() => {
    if (!session || !gameHostRef.current) {
      return undefined;
    }

    const scene = new RadioEscapeScene({
      gameMode: session.gameMode,
      startFloorIndex: session.startFloorIndex,
      onHudChange: (nextHud) => {
        startTransition(() => setHud(nextHud));
      },
      onPauseChange: (paused) => {
        startTransition(() => setHud((current) => ({ ...current, paused })));
      },
      onFloorReady: (info) => setFloorCard(info),
      onGameOver: (summary) => {
        recordScore(summary);
        setScreen('game-over');
      },
      onVictory: (summary) => {
        recordScore(summary);
        setScreen('ending');
      }
    });

    sceneRef.current = scene;
    if (import.meta.env.DEV) {
      window.__radioScene = scene;
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameHostRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#07060d',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [scene]
    });

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
    // recordScore reads `best` through state setters only, so the session id is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.setBroadcast(hud.stationName);
    audioRef.current.resume();
  }, [hud.stationName, screen]);

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
      const width = Math.max(1, Math.floor(GAME_WIDTH * scale));
      const height = Math.max(1, Math.floor(GAME_HEIGHT * scale));
      setCanvasSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    }

    fitCanvas();
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(gameStageRef.current);
    return () => observer.disconnect();
  }, []);

  function launch(gameMode, startFloorIndex = 0) {
    audioRef.current?.resume();
    setHud({ ...createInitialHud(), gameMode });
    setFloorCard(null);
    setRunSummary(null);
    setScreen('playing');
    setSession((current) => ({ id: (current?.id ?? 0) + 1, gameMode, startFloorIndex }));
  }

  function startDescent() {
    if (readStorage(INTRO_KEY, '') !== 'yes') {
      setIntroReturn('play');
      setScreen('intro');
      return;
    }
    launch('arcade', 0);
  }

  function finishIntro() {
    writeStorage(INTRO_KEY, 'yes');
    if (introReturn === 'play') {
      launch('arcade', 0);
    } else {
      setScreen('title');
    }
  }

  function goTitle() {
    sceneRef.current?.setPaused(false);
    setSession(null);
    setFloorCard(null);
    setScreen('title');
    setHud((current) => ({ ...current, paused: false }));
  }

  function beginFloor() {
    sceneRef.current?.beginFloor();
    setFloorCard(null);
  }

  // Floor cards and the title screen answer to Space and Enter.
  useEffect(() => {
    if (screen === 'playing' && floorCard) {
      const onKey = (event) => {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          beginFloor();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (screen === 'title') {
      const onKey = (event) => {
        if (event.code === 'Enter') {
          event.preventDefault();
          startDescent();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    return undefined;
  });

  const inRun = Boolean(session) && screen !== 'title' && screen !== 'intro';
  const tier = TIER_COLORS[hud.activityTier] ?? TIER_COLORS.red;
  const tierLabel = TIER_LABELS[hud.activityTier] ?? TIER_LABELS.red;
  const isTestLab = hud.gameMode === 'test-lab';
  const isFinalFloor = hud.engineMaxHp > 0;

  return (
    <main className={`rr-app ${inRun ? 'in-run' : 'in-menu'}`} style={{ '--tier': tier.css }}>
      <header className="rr-topbar">
        <button className="rr-brand" onClick={goTitle} type="button">
          <PixelSprite name="record" scale={2} />
          <span>Radio Reload</span>
        </button>
        <div className="rr-onair">
          <span className={`onair-light ${hud.signalState}`}>On Air</span>
          <strong>{hud.stationName}</strong>
          <span className="rr-tagline">{hud.stationTagline}</span>
        </div>
        {inRun ? (
          <div className="rr-floorbadge">
            <span>{hud.floorLabel}</span>
            <strong>{hud.floorName}</strong>
          </div>
        ) : (
          <div className="rr-floorbadge">
            <span>Best</span>
            <strong>{best}</strong>
          </div>
        )}
        <button
          aria-label={muted ? 'Unmute radio (M)' : 'Mute radio (M)'}
          aria-pressed={muted}
          className={`rr-mute ${muted ? 'muted' : ''}`}
          onClick={(event) => {
            setMuted((value) => !value);
            event.currentTarget.blur();
          }}
          title={muted ? 'Unmute (M)' : 'Mute (M)'}
          type="button"
        >
          <SpeakerIcon muted={muted} />
          <span>{muted ? 'Muted' : 'Sound'}</span>
        </button>
      </header>

      <section className="rr-body">
        <div className="rr-stage" ref={gameStageRef}>
          <div
            className="rr-screen"
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          >
            <div className="rr-canvas" ref={gameHostRef} />

            {screen === 'title' ? (
              <TitleScreen
                best={best}
                onHowTo={() => setScreen('how')}
                onIntro={() => {
                  setIntroReturn('title');
                  setScreen('intro');
                }}
                onStart={startDescent}
                onTestLab={() => launch('test-lab', 0)}
              />
            ) : null}

            {screen === 'how' ? <HowToScreen onBack={() => setScreen('title')} /> : null}

            {screen === 'intro' ? (
              <Cutscene
                finalLabel={introReturn === 'play' ? 'Start' : 'Back'}
                onDone={finishIntro}
                panels={INTRO_PANELS}
              />
            ) : null}

            {screen === 'playing' && floorCard ? (
              <FloorCard floor={floorCard} isTestLab={isTestLab} onBegin={beginFloor} />
            ) : null}

            {screen === 'playing' && hud.paused ? (
              <div className="rr-overlay dim">
                <div className="rr-card compact">
                  <p className="rr-kicker">Paused</p>
                  <h2>Broadcast on hold</h2>
                  <p>Press Esc or Resume to jump back in.</p>
                  <div className="rr-actions">
                    <button className="rr-button" onClick={() => sceneRef.current?.setPaused(false)} type="button">
                      Resume
                    </button>
                    <button className="rr-button ghost" onClick={goTitle} type="button">
                      Quit to Title
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {screen === 'game-over' && runSummary ? (
              <GameOverScreen
                onContinue={() => launch('arcade', runSummary.floorIndex)}
                onRestart={() => launch('arcade', 0)}
                onTitle={goTitle}
                summary={runSummary}
              />
            ) : null}

            {screen === 'ending' ? (
              <Cutscene finalLabel="Results" onDone={() => setScreen('results')} panels={ENDING_PANELS} />
            ) : null}

            {screen === 'results' && runSummary ? (
              <ResultsScreen
                best={best}
                onAgain={() => launch('arcade', 0)}
                onTitle={goTitle}
                summary={runSummary}
              />
            ) : null}
          </div>
        </div>

        {inRun ? (
          <aside className="rr-hud">
            <section className="hud-block">
              <p className="hud-label">The Descent</p>
              <ol className="floor-pips">
                {FLOORS.map((floor, index) => (
                  <li
                    className={
                      isTestLab
                        ? ''
                        : index < hud.floorIndex
                          ? 'done'
                          : index === hud.floorIndex
                            ? 'current'
                            : ''
                    }
                    key={floor.id}
                    title={floor.name}
                  >
                    {floor.label.replace('Floor ', '')}
                  </li>
                ))}
              </ol>
              <div className="hp-row" aria-label={`${hud.hp} of ${hud.maxHp} signal bars`}>
                <span className="hud-label">Signal</span>
                <span className="hp-bars">
                  {Array.from({ length: hud.maxHp }, (_, bar) => (
                    <i className={bar < hud.hp ? 'on' : ''} key={bar} style={{ height: `${10 + bar * 6}px` }} />
                  ))}
                </span>
              </div>
            </section>

            <section className="hud-block tune-ray">
              <div className="tune-ray-head">
                <PixelSprite name="tune-ray" scale={3} />
                <div>
                  <p className="hud-label">Tune Ray</p>
                  <strong className="tier-name">{tierLabel.name}</strong>
                </div>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${Math.max(4, Math.round(hud.powerScore * 100))}%` }} />
              </div>
              <div className="meter-caption">
                <span>{signalLabel(hud.signalState)} · {tierLabel.note}</span>
                <span>{hud.shotCooldownMs}ms</span>
              </div>
            </section>

            <section className="hud-block stat-grid">
              <div>
                <PixelSprite name="battery" scale={2} />
                <span className="hud-label">Charge</span>
                <strong className={hud.ammo <= 5 ? 'warn' : ''}>{hud.ammo}</strong>
              </div>
              <div>
                <PixelSprite name="goon-0" scale={2} />
                <span className="hud-label">Goons</span>
                <strong>{hud.kills}</strong>
              </div>
              <div className="wide">
                <span className="hud-label">Score</span>
                <strong>{hud.score.toLocaleString()}</strong>
              </div>
            </section>

            <section className="hud-block objective">
              <p className="hud-label">Objective</p>
              {isFinalFloor ? (
                <>
                  <p className="objective-text">Destroy the Dead Air Engine</p>
                  <div className="meter engine">
                    <div
                      className="meter-fill"
                      style={{ width: `${Math.round((hud.engineHp / hud.engineMaxHp) * 100)}%` }}
                    />
                  </div>
                </>
              ) : isTestLab ? (
                <p className="objective-text">Free play. Press R to retune. {hud.recordsTotal} records flipped.</p>
              ) : (
                <>
                  <div className="record-pips">
                    {Array.from({ length: hud.recordsToOpen }, (_, pip) => (
                      <PixelSprite
                        className={pip < hud.floorRecords ? 'got' : ''}
                        key={pip}
                        name="record"
                        scale={2}
                      />
                    ))}
                  </div>
                  <p className={`objective-text ${hud.elevatorOpen ? 'go' : ''}`}>
                    {hud.elevatorOpen
                      ? 'Elevator cued! Head to the top wall.'
                      : `${hud.floorRecords}/${hud.recordsToOpen} K-records to cue the elevator`}
                  </p>
                </>
              )}
            </section>

            <p className="hud-status">{hud.statusText}</p>

            {isTestLab ? (
              <section className="hud-block debug-grid">
                <p className="hud-label">Signal Lab</p>
                {[
                  ['Trigger', hud.activityReason],
                  ['Low-end', `${Math.round(hud.lowEndEnergy * 100)}%`],
                  ['Flux', `${Math.round(hud.spectralFlux * 100)}%`],
                  ['Onsets', `${Math.round(hud.onsetDensity * 100)}%`],
                  ['Pulse conf.', `${Math.round(hud.confidence * 100)}%`],
                  ['RMS', `${Math.round(hud.rms * 100)}%`],
                  ['ZCR', `${Math.round(hud.zeroCrossingRate * 100)}%`],
                  ['Speech band', `${Math.round(hud.speechBandRatio * 100)}%`],
                  ['Tempo', hud.smoothedPulseBpm ? `${hud.smoothedPulseBpm} BPM` : 'reading']
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </section>
            ) : null}
          </aside>
        ) : null}
      </section>
    </main>
  );
}

function TitleScreen({ best, onStart, onTestLab, onHowTo, onIntro }) {
  return (
    <div className="rr-overlay title-screen">
      <PanelCanvas className="title-backdrop" scene="tower" />
      <div className="title-content">
        <p className="rr-kicker">A Tunez Tower Story</p>
        <h1 className="logo">
          <span>Radio</span>
          <span>Reload</span>
        </h1>
        <p className="logo-sub">Dead Air Run</p>
        <div className="title-cast">
          <PixelSprite name="goon-0" scale={4} />
          <PixelSprite className="hero-bob" name="spin-down-0" scale={6} />
          <PixelSprite name="brute-0" scale={4} />
        </div>
        <div className="rr-actions stacked">
          <button className="rr-button big" onClick={onStart} type="button">
            Start the Descent
          </button>
          <div className="rr-actions">
            <button className="rr-button ghost" onClick={onHowTo} type="button">
              How to Play
            </button>
            <button className="rr-button ghost" onClick={onIntro} type="button">
              Watch Intro
            </button>
            <button className="rr-button ghost" onClick={onTestLab} type="button">
              Test Lab
            </button>
          </div>
        </div>
        <p className="title-foot">
          <span className="blink">Press Enter</span>
          {best ? <span>Best score {best.toLocaleString()}</span> : null}
        </p>
      </div>
    </div>
  );
}

function HowToScreen({ onBack }) {
  return (
    <div className="rr-overlay dim scroll">
      <div className="rr-card wide">
        <p className="rr-kicker">Field Guide</p>
        <h2>How to play</h2>
        <ul className="howto-list">
          {HOW_TO_PLAY.map((item) => (
            <li key={item.keys}>
              <kbd>{item.keys}</kbd>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="guide-grid">
          <figure>
            <PixelSprite name="spin-down-0" scale={4} />
            <figcaption><strong>Spin</strong>Kilo's robot DJ. That's you.</figcaption>
          </figure>
          <figure>
            <PixelSprite name="goon-0" scale={4} />
            <figcaption><strong>Clef Goon</strong>One hit. Some chase, some cut you off, some drift.</figcaption>
          </figure>
          <figure>
            <PixelSprite name="brute-0" scale={3} />
            <figcaption><strong>Clef Brute</strong>Three hits. Slow, and always drops a battery.</figcaption>
          </figure>
          <figure>
            <PixelSprite name="record" scale={4} />
            <figcaption><strong>K-record</strong>+15 charge, new station, opens the elevator.</figcaption>
          </figure>
          <figure>
            <PixelSprite name="battery" scale={4} />
            <figcaption><strong>Battery</strong>+5 charge.</figcaption>
          </figure>
          <figure>
            <PixelSprite name="engine-0" scale={1} />
            <figcaption><strong>Dead Air Engine</strong>Bassolini's jammer. Blast it apart on B3.</figcaption>
          </figure>
        </div>
        <div className="tier-legend">
          {Object.entries(TIER_LABELS).map(([key, value]) => (
            <span key={key} style={{ '--swatch': TIER_COLORS[key].css }}>
              <i /> {value.name}: {value.note.toLowerCase()}
            </span>
          ))}
        </div>
        <div className="rr-actions">
          <button className="rr-button" onClick={onBack} type="button">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function FloorCard({ floor, isTestLab, onBegin }) {
  return (
    <div className={`rr-overlay floor-card theme-${floor.theme}`} onClick={onBegin} role="presentation">
      <div className="floor-card-inner">
        <p className="rr-kicker">{isTestLab ? 'Test Lab' : `Stop ${floor.floorIndex + 1} of ${floor.floorCount}`}</p>
        <p className="floor-number">{floor.label}</p>
        <h2>{floor.name}</h2>
        <p className="floor-flavor">{floor.flavor}</p>
        <p className="floor-objective">{floor.objective}</p>
        <button className="rr-button big" onClick={onBegin} type="button">
          Drop the needle
        </button>
        <p className="title-foot">
          <span className="blink">Space to start</span>
          <span>Move WASD · Fire Space · Pause Esc</span>
        </p>
      </div>
    </div>
  );
}

function GameOverScreen({ summary, onContinue, onRestart, onTitle }) {
  const [line] = useState(() => GAME_OVER_LINES[Math.floor(Math.random() * GAME_OVER_LINES.length)]);
  return (
    <div className="rr-overlay game-over">
      <PanelCanvas className="game-over-panel" scene="captive" />
      <div className="game-over-content">
        <p className="rr-kicker">{summary.reason}</p>
        <h2 className="tune-in">Tune in again?</h2>
        <p>{line}</p>
        <p className="summary-line">
          Reached {summary.floorLabel} · {summary.score.toLocaleString()} pts · {summary.kills} goons ·{' '}
          {summary.recordsTotal} records
        </p>
        <div className="rr-actions">
          <button className="rr-button big" onClick={onContinue} type="button">
            Continue from {summary.floorLabel}
          </button>
          {summary.floorIndex > 0 ? (
            <button className="rr-button ghost" onClick={onRestart} type="button">
              Restart at Floor 50
            </button>
          ) : null}
          <button className="rr-button ghost" onClick={onTitle} type="button">
            Title
          </button>
        </div>
        <p className="title-foot">Continuing resets your score.</p>
      </div>
    </div>
  );
}

function ResultsScreen({ summary, best, onAgain, onTitle }) {
  return (
    <div className="rr-overlay results">
      <PanelCanvas className="title-backdrop" scene="dawn" />
      <div className="rr-card">
        <p className="rr-kicker">Broadcast restored</p>
        <h2>Kilo is home.</h2>
        <div className="results-grid">
          <div>
            <span>Score</span>
            <strong>{summary.score.toLocaleString()}</strong>
          </div>
          <div>
            <span>Goons dropped</span>
            <strong>{summary.kills}</strong>
          </div>
          <div>
            <span>K-records</span>
            <strong>{summary.recordsTotal}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{best.toLocaleString()}</strong>
          </div>
        </div>
        <p>Bassolini got away. The dial won't stay quiet for long.</p>
        <div className="rr-actions">
          <button className="rr-button big" onClick={onAgain} type="button">
            Run it back
          </button>
          <button className="rr-button ghost" onClick={onTitle} type="button">
            Title
          </button>
        </div>
      </div>
    </div>
  );
}

export default RadioEscapePage;
