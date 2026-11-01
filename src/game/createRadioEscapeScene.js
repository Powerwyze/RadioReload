import Phaser from 'phaser';
import {
  MAZE_ROWS,
  TILE_SIZE,
  cellToWorld,
  findNextStep,
  getNeighbors,
  isWalkableCell,
  randomFloorCell,
  worldToCell
} from './maze';
import { POWER_MODE } from './powerModes';
import { RADIO_STATIONS } from './radioStations';
import {
  SIGNAL_HISTORY_SIZE,
  getCadenceProfile,
  getSignalDebug,
  getTierProfile
} from './signalModel';

const PLAYER_START = { row: 11, col: 10 };
const ENEMY_SPAWNS = [
  { row: 1, col: 1 },
  { row: 1, col: 19 },
  { row: 15, col: 1 },
  { row: 15, col: 19 }
];

const DIRS = {
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 }
};
const BULLET_SPEED = 520;
const BULLET_RADIUS = 6;
const ENEMY_HIT_RADIUS = 18;
const STARTING_AMMO = 25;
const RECORD_AMMO_BONUS = 15;
const AMMO_DROP_BONUS = 5;
const RECORDS_TO_WIN = 10;
const KILLS_TO_WIN = 30;
const AMMO_DROP_CHANCE = 0.45;
const MIN_TIER_HOLD_MS = 1500;

function shuffle(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function bulletDirectionFromFacing(facing) {
  if (facing === 'left') {
    return { x: -1, y: 0 };
  }
  if (facing === 'up') {
    return { x: 0, y: -1 };
  }
  if (facing === 'down') {
    return { x: 0, y: 1 };
  }
  return { x: 1, y: 0 };
}

function getPressedDirection(keys) {
  if (keys.left.isDown || keys.a.isDown) {
    return { facing: 'left', vector: DIRS.left };
  }
  if (keys.right.isDown || keys.d.isDown) {
    return { facing: 'right', vector: DIRS.right };
  }
  if (keys.up.isDown || keys.w.isDown) {
    return { facing: 'up', vector: DIRS.up };
  }
  if (keys.down.isDown || keys.s.isDown) {
    return { facing: 'down', vector: DIRS.down };
  }
  return null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Phaser.Math.Distance.Between(point.x, point.y, start.x, start.y);
  }

  const t = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1
  );
  const nearestX = start.x + dx * t;
  const nearestY = start.y + dy * t;
  return Phaser.Math.Distance.Between(point.x, point.y, nearestX, nearestY);
}

function getWallPalette(profile) {
  return profile.palette;
}

function getAimOffsets(facing) {
  if (facing === 'left') {
    return {
      arm: { x: -7, y: 0, rotation: Math.PI },
      gun: { x: -15, y: 0, rotation: Math.PI },
      muzzle: { x: -23, y: 0 }
    };
  }

  if (facing === 'up') {
    return {
      arm: { x: 0, y: -7, rotation: -Math.PI / 2 },
      gun: { x: 0, y: -15, rotation: -Math.PI / 2 },
      muzzle: { x: 0, y: -23 }
    };
  }

  if (facing === 'down') {
    return {
      arm: { x: 0, y: 8, rotation: Math.PI / 2 },
      gun: { x: 0, y: 16, rotation: Math.PI / 2 },
      muzzle: { x: 0, y: 24 }
    };
  }

  return {
    arm: { x: 7, y: 0, rotation: 0 },
    gun: { x: 15, y: 0, rotation: 0 },
    muzzle: { x: 23, y: 0 }
  };
}

export class RadioEscapeScene extends Phaser.Scene {
  constructor({
    onHudChange,
    onGameOver,
    onPauseChange,
    gameMode = 'arcade'
  }) {
    super('RadioEscapeScene');
    this.onHudChange = onHudChange;
    this.onGameOver = onGameOver;
    this.onPauseChange = onPauseChange;
    this.powerMode = POWER_MODE;
    this.gameMode = gameMode;
  }

  create() {
    this.cameras.main.setBackgroundColor('#07090f');
    this.mode = 'ads';
    this.segmentRemaining = 0;
    this.station = RADIO_STATIONS[0];
    this.score = 0;
    this.kills = 0;
    this.recordsCollected = 0;
    this.ammo = STARTING_AMMO;
    this.aggressionLevel = 0;
    this.statusText = 'Tuning station and waiting for a steady pulse.';
    this.pulseLocked = false;
    this.pulseBpm = 0;
    this.confidence = 0;
    this.pulseStrength = 0;
    this.onsetDensity = 0;
    this.spectralFlux = 0;
    this.lowEndEnergy = 0;
    this.rms = 0;
    this.zeroCrossingRate = 0;
    this.speechBandRatio = 0;
    this.signalState = 'silence';
    this.smoothedPulseBpm = 0;
    this.signalHistory = [];
    this.tierChangedAt = 0;
    this.powerScore = 0;
    this.activityTier = 'red';
    this.activityReason = 'silence gate';
    this.shotCooldownMs = 900;
    this.shotProfileLabel = 'Dragging';
    this.nextShotAt = 0;
    this.facing = 'right';
    this.bullets = [];
    this.ammoPickups = [];
    this.isGameOver = false;
    this.isPaused = false;

    this.drawBoard();
    this.createPlayer();
    if (this.gameMode === 'arcade') {
      this.createEnemies();
    } else {
      this.enemies = [];
    }
    this.spawnRecord(true);
    this.bindInput();
    this.switchStation(true);

    this.pushHud();
  }

  drawBoard(cadenceProfile = getCadenceProfile({ signalState: 'silence' })) {
    if (!this.boardGraphics) {
      this.boardGraphics = this.add.graphics();
    }
    const g = this.boardGraphics;
    const wallPalette = getWallPalette(cadenceProfile);
    this.boardTier = cadenceProfile.tier;

    g.clear();
    g.fillStyle(0x05070b, 1);
    g.fillRect(0, 0, MAZE_ROWS[0].length * TILE_SIZE, MAZE_ROWS.length * TILE_SIZE);

    MAZE_ROWS.forEach((row, rowIndex) => {
      row.split('').forEach((tile, colIndex) => {
        const x = colIndex * TILE_SIZE;
        const y = rowIndex * TILE_SIZE;

        if (tile === '#') {
          g.fillStyle(wallPalette.fill, 1);
          g.fillRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
          g.lineStyle(4, wallPalette.glow, 0.2);
          g.strokeRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
          g.lineStyle(2, wallPalette.accent, 0.6);
          g.strokeRoundedRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10, 7);
        } else {
          g.fillStyle((rowIndex + colIndex) % 2 ? 0x111117 : 0x0c0d12, 0.9);
          g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          g.fillStyle(0x261228, 0.45);
          g.fillCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2);
        }
      });
    });
  }

  createPlayer() {
    const startPos = cellToWorld(PLAYER_START.row, PLAYER_START.col);
    const sprite = this.add.container(startPos.x, startPos.y);
    const shadow = this.add.ellipse(0, 16, 22, 8, 0x000000, 0.28);
    const legs = this.add.rectangle(0, 10, 10, 11, 0x4d2d7b, 1);
    const body = this.add.rectangle(0, 1, 18, 20, 0xffcf4d, 1);
    body.setStrokeStyle(3, 0x111111, 1);
    const head = this.add.circle(0, -13, 8, 0xffdf95, 1);
    head.setStrokeStyle(3, 0x111111, 1);
    const visor = this.add.rectangle(0, -13, 9, 3, 0x0f1722, 0.95);
    const arm = this.add.rectangle(7, 0, 11, 4, 0xffdf95, 1);
    const gun = this.add.rectangle(15, 0, 13, 5, 0x7cf6ff, 1);
    gun.setStrokeStyle(2, 0xffffff, 0.75);
    const muzzleFlash = this.add.star(23, 0, 6, 4, 8, 0xfff29a, 0.95);
    muzzleFlash.setScale(0.25);
    muzzleFlash.setAlpha(0);

    sprite.add([shadow, legs, body, head, visor, arm, gun, muzzleFlash]);
    sprite.setDepth(5);

    this.player = {
      sprite,
      shadow,
      legs,
      body,
      head,
      visor,
      arm,
      gun,
      muzzleFlash,
      row: PLAYER_START.row,
      col: PLAYER_START.col,
      moving: false,
      startTime: 0,
      duration: 140,
      from: { row: PLAYER_START.row, col: PLAYER_START.col },
      to: { row: PLAYER_START.row, col: PLAYER_START.col },
      direction: DIRS.right,
      shootTween: null
    };

    this.updatePlayerAimVisual();
  }

  updatePlayerAimVisual() {
    if (!this.player) {
      return;
    }

    const offsets = getAimOffsets(this.facing);
    this.player.arm.x = offsets.arm.x;
    this.player.arm.y = offsets.arm.y;
    this.player.arm.rotation = offsets.arm.rotation;

    this.player.gun.x = offsets.gun.x;
    this.player.gun.y = offsets.gun.y;
    this.player.gun.rotation = offsets.gun.rotation;

    this.player.muzzleFlash.x = offsets.muzzle.x;
    this.player.muzzleFlash.y = offsets.muzzle.y;
  }

  playShootAnimation() {
    if (!this.player) {
      return;
    }

    this.updatePlayerAimVisual();
    this.player.shootTween?.stop();

    this.player.muzzleFlash.setAlpha(0.95);
    this.player.muzzleFlash.setScale(0.35);
    this.player.gun.setScale(1, 1);
    this.player.body.setScale(1, 1);
    this.player.head.setScale(1, 1);

    this.player.shootTween = this.tweens.add({
      targets: [this.player.gun, this.player.body, this.player.head],
      scaleX: 0.94,
      scaleY: 0.94,
      duration: 40,
      yoyo: true,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.player.muzzleFlash.setScale(
          Phaser.Math.Linear(this.player.muzzleFlash.scaleX, 1.15, 0.45)
        );
        this.player.muzzleFlash.setAlpha(
          Phaser.Math.Linear(this.player.muzzleFlash.alpha, 0, 0.32)
        );
      },
      onComplete: () => {
        this.player.gun.setScale(1, 1);
        this.player.body.setScale(1, 1);
        this.player.head.setScale(1, 1);
        this.player.muzzleFlash.setAlpha(0);
        this.player.muzzleFlash.setScale(0.25);
        this.player.shootTween = null;
        this.updatePlayerAimVisual();
      }
    });
  }

  getMuzzleWorldPosition() {
    if (!this.player) {
      return { x: 0, y: 0 };
    }

    return {
      x: this.player.sprite.x + this.player.muzzleFlash.x,
      y: this.player.sprite.y + this.player.muzzleFlash.y
    };
  }

  createEnemies() {
    this.enemies = ENEMY_SPAWNS.map((spawn, index) => {
      const pos = cellToWorld(spawn.row, spawn.col);
      const sprite = this.add.rectangle(pos.x, pos.y, 26, 26, 0xff4f70 + index * 4000, 1);
      sprite.setStrokeStyle(3, 0x090b0f, 1);

      return {
        sprite,
        row: spawn.row,
        col: spawn.col,
        spawn,
        moving: false,
        startTime: 0,
        duration: 380 + index * 25,
        from: { ...spawn },
        to: { ...spawn },
        alive: true
      };
    });
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.isGameOver || this.isPaused) {
        return;
      }

      this.fireBullet();
    });

    this.input.keyboard.on('keydown-R', () => {
      if (this.isGameOver || this.isPaused || this.gameMode !== 'test-lab') {
        return;
      }

      this.statusText = 'Retuning test lab station.';
      this.switchStation();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.isGameOver) {
        return;
      }

      this.setPaused(!this.isPaused);
    });
  }

  fireBullet() {
    const now = this.time.now;
    if (this.ammo <= 0) {
      this.statusText = 'Out of ammo. Grab a record or look for an ammo drop.';
      this.pushHud();
      return;
    }

    if (now < this.nextShotAt) {
      return;
    }

    const dir = bulletDirectionFromFacing(this.facing);
    this.playShootAnimation();
    const muzzle = this.getMuzzleWorldPosition();
    const bullet = this.add.circle(muzzle.x, muzzle.y, BULLET_RADIUS, 0x7cf6ff, 1);
    bullet.setStrokeStyle(2, 0xffffff, 0.9);

    this.bullets.push({
      sprite: bullet,
      dir,
      speed: BULLET_SPEED,
      radius: BULLET_RADIUS
    });

    this.ammo -= 1;
    this.nextShotAt = now + this.shotCooldownMs;
    this.statusText = `Weapon ${this.shotProfileLabel.toLowerCase()}. Ammo at ${this.ammo}.`;
    this.pushHud();
  }

  spawnAmmoPickup(row, col) {
    const pos = cellToWorld(row, col);
    const sprite = this.add.rectangle(pos.x, pos.y, 18, 18, 0x56d7ff, 1);
    sprite.setStrokeStyle(3, 0xffffff, 0.9);

    this.tweens.add({
      targets: sprite,
      alpha: 0.45,
      yoyo: true,
      repeat: -1,
      duration: 380
    });

    this.ammoPickups.push({
      sprite,
      row,
      col,
      amount: AMMO_DROP_BONUS
    });
  }

  spawnRecord(initial = false) {
    if (this.record?.sprite) {
      this.record.sprite.destroy();
    }

    const exclusions = [PLAYER_START, ...ENEMY_SPAWNS];
    const cell = randomFloorCell(Math.random, exclusions);
    const pos = cellToWorld(cell.row, cell.col);
    const sprite = this.add.circle(pos.x, pos.y, 13, 0xfff4ab, 1);
    sprite.setStrokeStyle(4, 0xec3c63, 1);

    this.tweens.add({
      targets: sprite,
      angle: 360,
      duration: 2600,
      repeat: -1
    });

    this.record = {
      sprite,
      row: cell.row,
      col: cell.col
    };

    if (!initial) {
      this.statusText = 'Fresh record on the floor. Chase it.';
      this.pushHud();
    }
  }

  switchStation(force = false) {
    const nextOptions = RADIO_STATIONS.filter(
      (candidate) => force || candidate.name !== this.station?.name
    );
    this.station = nextOptions[Math.floor(Math.random() * nextOptions.length)];
    this.mode = 'ads';
    this.pulseLocked = false;
    this.pulseBpm = 0;
    this.confidence = 0;
    this.pulseStrength = 0;
    this.onsetDensity = 0;
    this.spectralFlux = 0;
    this.lowEndEnergy = 0;
    this.rms = 0;
    this.zeroCrossingRate = 0;
    this.speechBandRatio = 0;
    this.signalState = 'silence';
    this.smoothedPulseBpm = 0;
    this.signalHistory = [];
    this.tierChangedAt = 0;
    this.powerScore = 0;
    this.activityTier = 'red';
    this.activityReason = 'silence gate';
    this.shotCooldownMs = 1500;
    this.shotProfileLabel = 'Dragging';
    this.nextShotAt = 0;
    this.segmentRemaining = 0;
    this.statusText =
      this.gameMode === 'test-lab'
        ? `Tuning station and arming ${this.powerMode.title.toLowerCase()} in test lab. Press R or grab a record to retune.`
        : `Tuning station and arming ${this.powerMode.title.toLowerCase()}.`;
    this.pushHud();
  }

  handleStationFailure(stationName) {
    if (this.isGameOver || !this.station || stationName !== this.station.name) {
      return;
    }

    this.switchStation();
    this.statusText = `${stationName} is off the air. Retuning.`;
    this.pushHud();
  }

  setPaused(nextPaused) {
    if (this.isPaused === nextPaused) {
      return;
    }

    this.isPaused = nextPaused;
    this.statusText = nextPaused
      ? 'Broadcast paused. Press Esc to resume.'
      : this.gameMode === 'test-lab'
        ? `Back live in test lab. ${this.powerMode.title} is reading the station again.`
        : `Back live. ${this.powerMode.title} is reading the station again.`;
    this.onPauseChange?.(nextPaused);
    this.pushHud();
  }

  resolveBroadcastMode() {
    if (this.signalState === 'music') {
      return 'music';
    }
    return 'ads';
  }

  updateBroadcastStatus() {
    this.mode = this.resolveBroadcastMode();
    const effectiveBpm = Math.round(this.smoothedPulseBpm);
    const signalMetrics = {
      confidence: this.confidence,
      pulseStrength: this.pulseStrength,
      onsetDensity: this.onsetDensity,
      spectralFlux: this.spectralFlux,
      lowEndEnergy: this.lowEndEnergy,
      rms: this.rms,
      signalState: this.signalState,
      smoothedPulseBpm: this.smoothedPulseBpm
    };
    let cadenceProfile = getCadenceProfile(
      signalMetrics,
      this.signalHistory,
      this.activityTier
    );
    const now = this.time.now;
    if (cadenceProfile.tier !== this.activityTier) {
      // Hold each tier briefly so the gun and walls don't flicker; silence still drops at once.
      if (this.signalState !== 'silence' && now - this.tierChangedAt < MIN_TIER_HOLD_MS) {
        cadenceProfile = getTierProfile(this.activityTier, cadenceProfile.powerScore);
      } else {
        this.tierChangedAt = now;
      }
    }
    const signalDebug = getSignalDebug(
      signalMetrics,
      this.signalHistory,
      cadenceProfile.tier
    );
    if (this.signalState !== 'silence') {
      this.signalHistory.push(cadenceProfile.powerScore);
      if (this.signalHistory.length > SIGNAL_HISTORY_SIZE) {
        this.signalHistory.shift();
      }
    }
    this.powerScore = cadenceProfile.powerScore;
    this.activityTier = cadenceProfile.tier;
    this.activityReason = signalDebug.reason;
    this.shotCooldownMs = cadenceProfile.cooldownMs;
    this.shotProfileLabel = cadenceProfile.label;

    if (effectiveBpm > 0) {
      this.statusText = `${this.powerMode.title} reads ${this.signalState} and is holding ${this.activityTier} tier from ${this.activityReason} at about ${effectiveBpm} BPM. Fire cadence ${this.shotProfileLabel.toLowerCase()}, bullet speed fixed.`;
    } else {
      this.statusText = `${this.powerMode.title} reads ${this.signalState} and is holding ${this.activityTier} tier from ${this.activityReason}. Fire cadence ${this.shotProfileLabel.toLowerCase()}, bullet speed fixed.`;
    }

    if (cadenceProfile.tier !== this.boardTier) {
      this.drawBoard(cadenceProfile);
    }
  }

  setPulseState({
    stationName,
    steadyPulse,
    bpm,
    confidence,
    pulseStrength,
    onsetDensity,
    spectralFlux,
    lowEndEnergy,
    rms,
    zeroCrossingRate,
    speechBandRatio,
    signalState
  }) {
    if (this.isGameOver || !this.station || stationName !== this.station.name) {
      return;
    }

    this.pulseLocked = steadyPulse;
    this.pulseBpm = bpm ?? 0;
    this.confidence = confidence ?? 0;
    this.pulseStrength = pulseStrength ?? 0;
    this.onsetDensity = onsetDensity ?? 0;
    this.spectralFlux = spectralFlux ?? 0;
    this.lowEndEnergy = lowEndEnergy ?? 0;
    this.rms = rms ?? 0;
    this.zeroCrossingRate = zeroCrossingRate ?? 0;
    this.speechBandRatio = speechBandRatio ?? 0;
    this.signalState = signalState ?? this.signalState;
    this.smoothedPulseBpm = bpm && bpm > 0 ? bpm : 0;
    this.updateBroadcastStatus();
    this.pushHud();
  }

  clearBullets() {
    this.bullets.forEach(({ sprite }) => sprite.destroy());
    this.bullets = [];
  }

  startEntityMove(entity, nextCell, now, duration) {
    entity.moving = true;
    entity.startTime = now;
    entity.duration = duration;
    entity.from = { row: entity.row, col: entity.col };
    entity.to = { row: nextCell.row, col: nextCell.col };
  }

  advanceEntity(entity, now) {
    if (!entity.moving) {
      return;
    }

    const start = cellToWorld(entity.from.row, entity.from.col);
    const end = cellToWorld(entity.to.row, entity.to.col);
    const progress = Phaser.Math.Clamp((now - entity.startTime) / entity.duration, 0, 1);

    entity.sprite.x = Phaser.Math.Linear(start.x, end.x, progress);
    entity.sprite.y = Phaser.Math.Linear(start.y, end.y, progress);

    if (progress >= 1) {
      entity.row = entity.to.row;
      entity.col = entity.to.col;
      entity.moving = false;
    }
  }

  handlePlayerMovement(now) {
    const pressedDirection = getPressedDirection(this.keys);
    if (pressedDirection) {
      this.facing = pressedDirection.facing;
      this.updatePlayerAimVisual();
    }

    this.advanceEntity(this.player, now);

    if (this.player.moving) {
      return;
    }

    if (!pressedDirection) {
      return;
    }

    const direction = pressedDirection.vector;
    const targetRow = this.player.row + direction.dy;
    const targetCol = this.player.col + direction.dx;
    if (!isWalkableCell(targetRow, targetCol)) {
      return;
    }

    this.player.direction = direction;
    this.startEntityMove(
      this.player,
      { row: targetRow, col: targetCol },
      now,
      this.mode === 'music' ? 135 : 145
    );
  }

  handleEnemyMovement(now) {
    if (this.gameMode !== 'arcade') {
      return;
    }

    const playerCell = { row: this.player.row, col: this.player.col };

    this.enemies.forEach((enemy, index) => {
      if (!enemy.alive) {
        return;
      }

      this.advanceEntity(enemy, now);

      if (enemy.moving) {
        return;
      }

      const pathStep = findNextStep({ row: enemy.row, col: enemy.col }, playerCell);
      const fallbackSteps = shuffle(getNeighbors(enemy.row, enemy.col));
      let nextStep = pathStep;

      if (this.mode === 'music' && Math.random() < 0.22 && fallbackSteps.length) {
        nextStep = fallbackSteps[0];
      }

      if (nextStep.row === enemy.row && nextStep.col === enemy.col) {
        return;
      }

      this.startEntityMove(
        enemy,
        { row: nextStep.row, col: nextStep.col },
        now,
        this.getEnemyMoveDuration(index)
      );
    });
  }

  getEnemyMoveDuration(index) {
    const musicBase = 420 + index * 15;
    const adsBase = 270 + index * 10;
    const baseDuration = this.mode === 'music' ? musicBase : adsBase;
    return Math.max(130, baseDuration - this.aggressionLevel * 35);
  }

  updateBullets(delta) {
    const survivors = [];

    this.bullets.forEach((bullet) => {
      const previousPosition = {
        x: bullet.sprite.x,
        y: bullet.sprite.y
      };
      const nextPosition = {
        x: bullet.sprite.x + bullet.dir.x * bullet.speed * (delta / 1000),
        y: bullet.sprite.y + bullet.dir.y * bullet.speed * (delta / 1000)
      };
      bullet.sprite.x = nextPosition.x;
      bullet.sprite.y = nextPosition.y;

      const bulletCell = worldToCell(bullet.sprite.x, bullet.sprite.y);
      if (!isWalkableCell(bulletCell.row, bulletCell.col)) {
        bullet.sprite.destroy();
        return;
      }

      const hitEnemy = this.enemies.find(
        (enemy) =>
          enemy.alive &&
          distancePointToSegment(
            { x: enemy.sprite.x, y: enemy.sprite.y },
            previousPosition,
            nextPosition
          ) <= ENEMY_HIT_RADIUS + bullet.radius
      );
      if (hitEnemy) {
        bullet.sprite.destroy();
        this.dropEnemy(hitEnemy);
        return;
      }

      survivors.push(bullet);
    });

    this.bullets = survivors;
  }

  dropEnemy(enemy) {
    enemy.alive = false;
    enemy.sprite.setVisible(false);
    this.score += 40;
    this.kills += 1;
    this.aggressionLevel = Math.floor(this.kills / 5);
    const droppedAmmo = Math.random() < AMMO_DROP_CHANCE;
    if (droppedAmmo) {
      this.spawnAmmoPickup(enemy.row, enemy.col);
    }
    this.statusText = droppedAmmo
      ? `Bad guy dropped. Ammo crate down for ${AMMO_DROP_BONUS}.`
      : 'Bad guy dropped. Use the lane.';
    this.pushHud();
    this.checkVictory();

    this.time.delayedCall(1600, () => {
      if (this.isGameOver) {
        return;
      }

      enemy.row = enemy.spawn.row;
      enemy.col = enemy.spawn.col;
      const pos = cellToWorld(enemy.row, enemy.col);
      enemy.sprite.x = pos.x;
      enemy.sprite.y = pos.y;
      enemy.sprite.setVisible(true);
      enemy.alive = true;
      enemy.moving = false;
    });
  }

  checkRecordPickup() {
    if (!this.record) {
      return;
    }

    if (this.player.row !== this.record.row || this.player.col !== this.record.col) {
      return;
    }

    this.recordsCollected += 1;
    this.ammo += RECORD_AMMO_BONUS;
    this.score += 25;
    this.switchStation();
    this.spawnRecord();
    this.statusText = `Needle drop. +${RECORD_AMMO_BONUS} ammo and a fresh station online.`;
    this.pushHud();
    this.checkVictory();
  }

  checkAmmoPickup() {
    if (!this.ammoPickups.length) {
      return;
    }

    const remainingPickups = [];

    this.ammoPickups.forEach((pickup) => {
      if (this.player.row === pickup.row && this.player.col === pickup.col) {
        pickup.sprite.destroy();
        this.ammo += pickup.amount;
        this.statusText = `Ammo pickup grabbed. +${pickup.amount} bullets.`;
        this.pushHud();
        return;
      }

      remainingPickups.push(pickup);
    });

    this.ammoPickups = remainingPickups;
  }

  checkVictory() {
    if (this.recordsCollected >= RECORDS_TO_WIN) {
      this.finishRun('You win. Ten records collected and the broadcast is yours.');
      return;
    }

    if (this.kills >= KILLS_TO_WIN) {
      this.finishRun('You win. Thirty bad guys dropped and the floor is clear.');
    }
  }

  finishRun(reason) {
    this.isGameOver = true;
    this.clearBullets();
    this.statusText = reason;
    this.pushHud();
    this.onGameOver?.(reason);
  }

  checkEnemyContact() {
    if (this.gameMode !== 'arcade') {
      return;
    }

    const hit = this.enemies.some(
      (enemy) =>
        enemy.alive &&
        Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          this.player.sprite.x,
          this.player.sprite.y
        ) < 24
    );
    if (!hit) {
      return;
    }

    this.isGameOver = true;
    this.clearBullets();
    this.statusText = 'A bad guy got hands on you.';
    this.pushHud();
    this.onGameOver?.('A bad guy touched the hero. Broadcast lost.');
  }

  pushHud() {
    this.onHudChange?.({
      stationName: this.station.name,
      stationTagline: this.station.tagline,
      broadcastMode: this.mode,
      powerMode: this.powerMode.id,
      powerModeTitle: this.powerMode.title,
      powerScore: Number(this.powerScore.toFixed(2)),
      activityTier: this.activityTier,
      activityReason: this.activityReason,
      gameMode: this.gameMode,
      pulseLocked: this.pulseLocked,
      pulseBpm: this.pulseBpm,
      smoothedPulseBpm: Math.round(this.smoothedPulseBpm),
      confidence: Number(this.confidence.toFixed(2)),
      pulseStrength: Number(this.pulseStrength.toFixed(2)),
      onsetDensity: Number(this.onsetDensity.toFixed(2)),
      spectralFlux: Number(this.spectralFlux.toFixed(2)),
      lowEndEnergy: Number(this.lowEndEnergy.toFixed(2)),
      rms: Number(this.rms.toFixed(3)),
      zeroCrossingRate: Number(this.zeroCrossingRate.toFixed(3)),
      speechBandRatio: Number(this.speechBandRatio.toFixed(2)),
      signalState: this.signalState,
      shotProfileLabel: this.shotProfileLabel,
      shotCooldownMs: this.shotCooldownMs,
      segmentRemaining: this.segmentRemaining,
      score: this.score,
      recordsCollected: this.recordsCollected,
      kills: this.kills,
      ammo: this.ammo,
      aggressionLevel: this.aggressionLevel,
      recordsToWin: RECORDS_TO_WIN,
      killsToWin: KILLS_TO_WIN,
      paused: this.isPaused,
      statusText: this.statusText,
      canShoot: this.ammo > 0
    });
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) {
      return;
    }

    // Holding Space keeps firing at the current cadence; key repeats don't re-emit keydown.
    if (this.keys.space.isDown && this.ammo > 0) {
      this.fireBullet();
    }

    this.handlePlayerMovement(time);
    this.handleEnemyMovement(time);
    this.updateBullets(delta);
    this.checkRecordPickup();
    this.checkAmmoPickup();
    this.checkEnemyContact();
  }
}
