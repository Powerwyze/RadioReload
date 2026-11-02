import Phaser from 'phaser';
import { registerArt, registerBoard } from './art/textures';
import { TIER_COLORS } from './art/palette';
import { FLOORS, TEST_LAB_FLOOR } from './floors';
import {
  MAZE_COLS,
  MAZE_ROW_COUNT,
  PIXEL_SCALE,
  TILE_SIZE,
  cellToWorld,
  createMaze,
  manhattan,
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

const DIRS = {
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 }
};
const BLAST_SPEED = 540;
const BLAST_RADIUS = 8;
const STARTING_AMMO = 25;
const FLOOR_MIN_AMMO = 20;
const RECORD_AMMO_BONUS = 15;
const AMMO_DROP_BONUS = 5;
const AMMO_DROP_CHANCE = 0.45;
const MAX_HP = 3;
const INVULNERABLE_MS = 1600;
const RESPAWN_MS = 1800;
const MIN_TIER_HOLD_MS = 1500;
const PLAYER_STEP_MS = 140;
const ENEMY_TYPES = {
  goon: { texture: 'goon-0', anim: 'goon-walk', hp: 1, score: 40, contact: 26, hitRadius: 20 },
  brute: { texture: 'brute-0', anim: 'brute-walk', hp: 3, score: 120, contact: 32, hitRadius: 26 }
};
const DEPTH = {
  trim: 2,
  pickup: 6,
  decor: 8,
  shadow: 9,
  actor: 10,
  blast: 14,
  fx: 16
};

function shuffle(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getPressedDirection(keys) {
  if (keys.left.isDown || keys.a.isDown) {
    return 'left';
  }
  if (keys.right.isDown || keys.d.isDown) {
    return 'right';
  }
  if (keys.up.isDown || keys.w.isDown) {
    return 'up';
  }
  if (keys.down.isDown || keys.s.isDown) {
    return 'down';
  }
  return null;
}

function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Phaser.Math.Distance.Between(point.x, point.y, start.x, start.y);
  }

  const t = Phaser.Math.Clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1
  );
  return Phaser.Math.Distance.Between(point.x, point.y, start.x + dx * t, start.y + dy * t);
}

// Where the Tune Ray sits for each facing. Up tucks it behind Spin.
const TUNE_RAY_POSE = {
  right: { x: 15, y: 9, angle: 0, flipX: false, behind: false },
  left: { x: -15, y: 9, angle: 0, flipX: true, behind: false },
  down: { x: 14, y: 12, angle: 90, flipX: false, behind: false },
  up: { x: -14, y: -2, angle: -90, flipX: false, behind: true }
};

export class RadioEscapeScene extends Phaser.Scene {
  constructor({
    onHudChange,
    onGameOver,
    onPauseChange,
    onFloorReady,
    onVictory,
    gameMode = 'arcade',
    startFloorIndex = 0
  }) {
    super('RadioEscapeScene');
    this.onHudChange = onHudChange;
    this.onGameOver = onGameOver;
    this.onPauseChange = onPauseChange;
    this.onFloorReady = onFloorReady;
    this.onVictory = onVictory;
    this.powerMode = POWER_MODE;
    this.gameMode = gameMode;
    this.startFloorIndex = gameMode === 'test-lab' ? 0 : startFloorIndex;
  }

  create() {
    registerArt(this);
    this.cameras.main.setBackgroundColor('#07060d');

    this.mode = 'ads';
    this.station = RADIO_STATIONS[0];
    this.score = 0;
    this.kills = 0;
    this.recordsTotal = 0;
    this.ammo = STARTING_AMMO;
    this.hp = MAX_HP;
    this.statusText = 'Tuning station and waiting for a steady pulse.';
    this.resetSignal();
    this.facing = 'up';
    this.bullets = [];
    this.ammoPickups = [];
    this.floorObjects = [];
    this.enemies = [];
    this.isGameOver = false;
    this.isPaused = false;
    this.awaitingStart = true;
    this.transitioning = false;

    this.bindInput();
    this.station = RADIO_STATIONS[Math.floor(Math.random() * RADIO_STATIONS.length)];
    this.loadFloor(this.startFloorIndex);
  }

  resetSignal() {
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
  }

  // ---------- Floors ----------

  loadFloor(index) {
    this.floorObjects.forEach((object) => object.destroy());
    this.floorObjects = [];
    this.clearBullets();
    this.ammoPickups = [];
    this.enemies = [];
    this.record = null;

    this.floorIndex = index;
    this.floor = this.gameMode === 'test-lab' ? TEST_LAB_FLOOR : FLOORS[index];
    this.maze = createMaze(this.floor.rows);
    this.floorRecords = 0;
    this.floorKills = 0;
    this.elevatorOpen = false;
    this.engineHp = this.floor.engineHp ?? 0;
    this.hp = MAX_HP;
    this.ammo = Math.max(this.ammo, FLOOR_MIN_AMMO);
    this.aggressionLevel = this.floor.baseAggression;
    this.invulnerableUntil = 0;
    this.trimTier = null;

    const board = this.track(this.add.image(0, 0, registerBoard(this, this.floor)));
    board.setOrigin(0, 0).setScale(PIXEL_SCALE);
    this.trimGraphics = this.track(this.add.graphics().setDepth(DEPTH.trim));
    this.drawTrim(this.activityTier);

    this.placeDecor();
    this.createPlayer();
    this.createEnemies();
    this.spawnRecord(true);

    this.awaitingStart = true;
    this.transitioning = false;
    this.queuedDirection = null;
    this.statusText = `${this.floor.label}: ${this.floor.name}. ${this.floor.objective}`;
    this.onFloorReady?.(this.getFloorInfo());
    this.pushHud();
  }

  beginFloor() {
    if (!this.awaitingStart || this.isGameOver) {
      return;
    }
    this.awaitingStart = false;
    // The key that dismissed the floor card shouldn't also fire a blast.
    this.nextShotAt = this.time.now + 250;
    this.statusText = this.floor.objective;
    this.pushHud();
  }

  getFloorInfo() {
    return {
      floorIndex: this.floorIndex,
      floorCount: FLOORS.length,
      id: this.floor.id,
      theme: this.floor.theme,
      label: this.floor.label,
      name: this.floor.name,
      flavor: this.floor.flavor,
      objective: this.floor.objective
    };
  }

  track(object) {
    this.floorObjects.push(object);
    return object;
  }

  placeDecor() {
    this.engineCells = [];
    this.elevatorSprite = null;
    this.engineSprite = null;
    this.bassoliniSprite = null;
    this.elevatorArrow = null;

    this.floor.rows.forEach((line, row) => {
      line.split('').forEach((char, col) => {
        const pos = cellToWorld(row, col);
        if (char === 'E') {
          this.engineCells.push({ row, col });
        } else if (char === 'K') {
          this.track(this.add.image(pos.x, pos.y, 'kilo-tied'))
            .setScale(PIXEL_SCALE)
            .setDepth(DEPTH.decor);
        } else if (char === 'B') {
          this.bassoliniSprite = this.track(this.add.image(pos.x, pos.y - 6, 'bassolini'))
            .setScale(PIXEL_SCALE * 0.8)
            .setDepth(DEPTH.decor);
        }
      });
    });

    if (this.engineCells.length) {
      const first = this.engineCells[0];
      const x = first.col * TILE_SIZE;
      const y = first.row * TILE_SIZE;
      this.engineSprite = this.track(this.add.sprite(x, y, 'engine-0'))
        .setOrigin(0, 0)
        .setScale(PIXEL_SCALE)
        .setDepth(DEPTH.decor)
        .play('engine-hum');
    }

    if (this.floor.elevator) {
      const pos = cellToWorld(this.floor.elevator.row, this.floor.elevator.col);
      this.elevatorSprite = this.track(this.add.image(pos.x, pos.y, 'elevator-closed'))
        .setScale(PIXEL_SCALE)
        .setDepth(DEPTH.decor);
    }
  }

  drawTrim(tier) {
    if (!this.trimGraphics || this.trimTier === tier) {
      return;
    }
    this.trimTier = tier;
    const g = this.trimGraphics;
    const color = TIER_COLORS[tier].glow;
    const rows = this.floor.rows;
    const isWall = (row, col) => (rows[row]?.[col] ?? '#') === '#';
    const segments = [];

    for (let row = 0; row < MAZE_ROW_COUNT; row += 1) {
      for (let col = 0; col < MAZE_COLS; col += 1) {
        if (!isWall(row, col)) {
          continue;
        }
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        if (row + 1 < MAZE_ROW_COUNT && !isWall(row + 1, col)) {
          segments.push([x, y + TILE_SIZE, x + TILE_SIZE, y + TILE_SIZE]);
        }
        if (row > 0 && !isWall(row - 1, col)) {
          segments.push([x, y, x + TILE_SIZE, y]);
        }
        if (col > 0 && !isWall(row, col - 1)) {
          segments.push([x, y, x, y + TILE_SIZE]);
        }
        if (col + 1 < MAZE_COLS && !isWall(row, col + 1)) {
          segments.push([x + TILE_SIZE, y, x + TILE_SIZE, y + TILE_SIZE]);
        }
      }
    }

    g.clear();
    [
      [9, 0.1],
      [4, 0.28],
      [2, 0.95]
    ].forEach(([width, alpha]) => {
      g.lineStyle(width, color, alpha);
      segments.forEach(([x1, y1, x2, y2]) => g.lineBetween(x1, y1, x2, y2));
    });
  }

  // ---------- Actors ----------

  createPlayer() {
    const start = this.floor.playerStart;
    const pos = cellToWorld(start.row, start.col);
    const shadow = this.track(this.add.ellipse(pos.x, pos.y + 20, 30, 10, 0x000000, 0.35));
    shadow.setDepth(DEPTH.shadow);
    const sprite = this.track(this.add.sprite(pos.x, pos.y, 'spin-up-0'));
    sprite.setScale(PIXEL_SCALE).setDepth(DEPTH.actor);
    const tuneRay = this.track(this.add.image(pos.x, pos.y, 'tune-ray'));
    tuneRay.setScale(2);
    const muzzle = this.track(this.add.image(pos.x, pos.y, 'muzzle'));
    muzzle.setScale(PIXEL_SCALE).setDepth(DEPTH.fx).setAlpha(0);

    this.facing = 'up';
    this.player = {
      sprite,
      shadow,
      tuneRay,
      muzzle,
      row: start.row,
      col: start.col,
      moving: false,
      startTime: 0,
      duration: PLAYER_STEP_MS,
      from: { ...start },
      to: { ...start }
    };
    this.syncPlayerVisual(false);
  }

  syncPlayerVisual(walking) {
    const { sprite, shadow, tuneRay } = this.player;
    const view = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    const anim = `spin-${view}`;
    sprite.setFlipX(this.facing === 'left');

    if (walking) {
      if (sprite.anims.currentAnim?.key !== anim || !sprite.anims.isPlaying) {
        sprite.play(anim, true);
      }
    } else {
      sprite.stop();
      sprite.setTexture(`${anim}-0`);
    }

    const pose = TUNE_RAY_POSE[this.facing];
    tuneRay.setPosition(sprite.x + pose.x, sprite.y + pose.y);
    tuneRay.setAngle(pose.angle).setFlipX(pose.flipX);
    tuneRay.setDepth(pose.behind ? DEPTH.actor - 0.5 : DEPTH.actor + 0.5);
    shadow.setPosition(sprite.x, sprite.y + 20);
  }

  createEnemies() {
    if (this.gameMode !== 'arcade') {
      return;
    }

    this.enemies = this.floor.enemies.map((ai, index) => {
      const type = ai === 'brute' ? 'brute' : 'goon';
      const spec = ENEMY_TYPES[type];
      const spawn = this.floor.spawns[index % this.floor.spawns.length];
      const pos = cellToWorld(spawn.row, spawn.col);
      const shadow = this.track(
        this.add.ellipse(pos.x, pos.y + 20, type === 'brute' ? 40 : 30, 10, 0x000000, 0.35)
      ).setDepth(DEPTH.shadow);
      const sprite = this.track(this.add.sprite(pos.x, pos.y, spec.texture));
      sprite.setScale(PIXEL_SCALE).setDepth(DEPTH.actor - 1).play(spec.anim);
      sprite.anims.setProgress(Math.random());

      return {
        type,
        ai,
        spec,
        sprite,
        shadow,
        hp: spec.hp,
        row: spawn.row,
        col: spawn.col,
        spawn,
        moving: false,
        startTime: 0,
        duration: 400,
        from: { ...spawn },
        to: { ...spawn },
        lastStep: null,
        alive: true,
        harmlessUntil: 0
      };
    });
  }

  // ---------- Input & weapon ----------

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

    // Taps shorter than a frame never show up in isDown, so buffer them from keydown.
    const tapDirections = {
      LEFT: 'left',
      A: 'left',
      RIGHT: 'right',
      D: 'right',
      UP: 'up',
      W: 'up',
      DOWN: 'down',
      S: 'down'
    };
    Object.entries(tapDirections).forEach(([key, direction]) => {
      this.input.keyboard.on(`keydown-${key}`, () => {
        this.queuedDirection = direction;
      });
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.isGameOver && !this.isPaused && !this.awaitingStart && !this.transitioning) {
        this.fireBullet();
      }
    });

    this.input.keyboard.on('keydown-R', () => {
      if (this.isGameOver || this.isPaused || this.gameMode !== 'test-lab') {
        return;
      }
      this.switchStation();
      this.statusText = 'Retuning the test lab station.';
      this.pushHud();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.isGameOver || this.awaitingStart || this.transitioning) {
        return;
      }
      this.setPaused(!this.isPaused);
    });
  }

  fireBullet() {
    const now = this.time.now;
    if (now < this.nextShotAt) {
      return;
    }
    if (this.ammo <= 0) {
      this.nextShotAt = now + 800;
      this.statusText = 'Tune Ray is out of charge. Grab a K-record or a battery.';
      this.pushHud();
      return;
    }

    const dir = DIRS[this.facing];
    const { sprite, muzzle, tuneRay } = this.player;
    const color = TIER_COLORS[this.activityTier];
    const startX = sprite.x + dir.dx * 26;
    const startY = sprite.y + dir.dy * 26;
    const blast = this.add.image(startX, startY, 'blast');
    blast.setScale(PIXEL_SCALE).setTint(color.glow).setDepth(DEPTH.blast);
    blast.setAngle({ right: 0, down: 90, left: 180, up: -90 }[this.facing]);

    this.bullets.push({ sprite: blast, dir, speed: BLAST_SPEED, radius: BLAST_RADIUS });

    muzzle.setPosition(sprite.x + dir.dx * 34, sprite.y + dir.dy * 34 + (dir.dy ? 0 : 6));
    muzzle.setTint(color.accent).setAlpha(1).setScale(PIXEL_SCALE * 0.6);
    this.tweens.add({
      targets: muzzle,
      alpha: 0,
      scale: PIXEL_SCALE * 1.1,
      duration: 110,
      ease: 'Quad.easeOut'
    });
    this.tweens.add({
      targets: tuneRay,
      x: tuneRay.x - dir.dx * 4,
      y: tuneRay.y - dir.dy * 4,
      duration: 50,
      yoyo: true,
      onComplete: () => this.syncPlayerVisual(this.player.moving)
    });

    this.ammo -= 1;
    this.nextShotAt = now + this.shotCooldownMs;
    this.pushHud();
  }

  // ---------- Pickups ----------

  spawnAmmoPickup(row, col) {
    const pos = cellToWorld(row, col);
    const sprite = this.track(this.add.image(pos.x, pos.y, 'battery'));
    sprite.setScale(PIXEL_SCALE).setDepth(DEPTH.pickup);
    this.tweens.add({
      targets: sprite,
      y: pos.y - 5,
      yoyo: true,
      repeat: -1,
      duration: 420,
      ease: 'Sine.easeInOut'
    });
    this.ammoPickups.push({ sprite, row, col, amount: AMMO_DROP_BONUS });
  }

  spawnRecord(initial = false) {
    this.record?.sprite.destroy();

    const exclusions = [this.floor.playerStart, ...this.floor.spawns];
    const playerCell = this.player
      ? { row: this.player.row, col: this.player.col }
      : this.floor.playerStart;
    const cell = this.maze.randomFloorCell(Math.random, exclusions, playerCell, 6);
    const pos = cellToWorld(cell.row, cell.col);
    const sprite = this.track(this.add.image(pos.x, pos.y, 'record'));
    sprite.setScale(PIXEL_SCALE).setDepth(DEPTH.pickup);
    this.tweens.add({ targets: sprite, angle: 360, duration: 2200, repeat: -1 });
    this.tweens.add({
      targets: sprite,
      scale: PIXEL_SCALE * 1.12,
      yoyo: true,
      repeat: -1,
      duration: 500,
      ease: 'Sine.easeInOut'
    });

    this.record = { sprite, row: cell.row, col: cell.col };

    if (!initial) {
      this.pushHud();
    }
  }

  checkRecordPickup() {
    if (!this.record || this.player.row !== this.record.row || this.player.col !== this.record.col) {
      return;
    }

    const { x, y } = this.record.sprite;
    this.floorRecords += 1;
    this.recordsTotal += 1;
    this.ammo += RECORD_AMMO_BONUS;
    this.score += 25;
    this.floatText(x, y - 20, 'NEEDLE DROP', '#ffd23f');
    this.burst(x, y, 0xffd23f, 10);
    this.switchStation();
    this.spawnRecord();

    const needed = this.floor.recordsToOpen;
    if (this.floor.elevator && this.floorRecords === needed) {
      this.openElevator();
    } else if (this.floor.elevator && this.floorRecords < needed) {
      this.statusText = `K-record ${this.floorRecords} of ${needed}. +${RECORD_AMMO_BONUS} charge and a fresh station.`;
    } else {
      this.statusText = `Needle drop. +${RECORD_AMMO_BONUS} charge and a fresh station.`;
    }
    this.pushHud();
  }

  checkAmmoPickup() {
    this.ammoPickups = this.ammoPickups.filter((pickup) => {
      if (this.player.row !== pickup.row || this.player.col !== pickup.col) {
        return true;
      }
      this.floatText(pickup.sprite.x, pickup.sprite.y - 16, `+${pickup.amount}`, '#5cf4ff');
      pickup.sprite.destroy();
      this.ammo += pickup.amount;
      this.statusText = `Battery grabbed. +${pickup.amount} charge.`;
      this.pushHud();
      return false;
    });
  }

  openElevator() {
    this.elevatorOpen = true;
    this.elevatorSprite?.setTexture('elevator-open');
    const { row, col } = this.floor.elevator;
    const pos = cellToWorld(row + 1, col);
    this.elevatorArrow = this.track(
      this.add.triangle(pos.x, pos.y - 4, 0, 14, 10, 0, 20, 14, 0x5dff8f, 0.95)
    ).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: this.elevatorArrow,
      y: pos.y - 14,
      yoyo: true,
      repeat: -1,
      duration: 360,
      ease: 'Sine.easeInOut'
    });
    this.cameras.main.flash(180, 93, 255, 143, false);
    this.statusText = 'Elevator cued. Get to the top of the floor and ride it down.';
  }

  // ---------- Radio ----------

  switchStation(force = false) {
    const nextOptions = RADIO_STATIONS.filter(
      (candidate) => force || candidate.name !== this.station?.name
    );
    this.station = nextOptions[Math.floor(Math.random() * nextOptions.length)];
    this.mode = 'ads';
    this.resetSignal();
    this.drawTrim('red');
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
    // Freeze respawn timers, bobbing pickups and walk cycles along with the game.
    this.time.paused = nextPaused;
    if (nextPaused) {
      this.tweens.pauseAll();
      this.anims.pauseAll();
    } else {
      this.tweens.resumeAll();
      this.anims.resumeAll();
    }
    this.statusText = nextPaused ? 'Broadcast paused.' : 'Back on air.';
    this.onPauseChange?.(nextPaused);
    this.pushHud();
  }

  updateBroadcastStatus() {
    this.mode = this.signalState === 'music' ? 'music' : 'ads';
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
    let cadenceProfile = getCadenceProfile(signalMetrics, this.signalHistory, this.activityTier);
    const now = this.time.now;
    if (cadenceProfile.tier !== this.activityTier) {
      // Hold each tier briefly so the gun and walls don't flicker; silence still drops at once.
      if (this.signalState !== 'silence' && now - this.tierChangedAt < MIN_TIER_HOLD_MS) {
        cadenceProfile = getTierProfile(this.activityTier, cadenceProfile.powerScore);
      } else {
        this.tierChangedAt = now;
      }
    }
    const signalDebug = getSignalDebug(signalMetrics, this.signalHistory, cadenceProfile.tier);
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
    this.drawTrim(cadenceProfile.tier);
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

  // ---------- Movement ----------

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

  isElevatorCell(row, col) {
    const elevator = this.floor.elevator;
    return Boolean(elevator && elevator.row === row && elevator.col === col);
  }

  handlePlayerMovement(now) {
    const pressed = getPressedDirection(this.keys) ?? this.queuedDirection;
    if (pressed && !this.player.moving) {
      this.facing = pressed;
    }

    this.advanceEntity(this.player, now);

    if (!this.player.moving && this.isElevatorCell(this.player.row, this.player.col)) {
      this.completeFloor();
      return;
    }

    if (!this.player.moving && pressed) {
      this.queuedDirection = null;
      const dir = DIRS[pressed];
      const row = this.player.row + dir.dy;
      const col = this.player.col + dir.dx;
      const canEnter =
        this.maze.isWalkable(row, col) || (this.elevatorOpen && this.isElevatorCell(row, col));
      if (canEnter) {
        this.startEntityMove(this.player, { row, col }, now, PLAYER_STEP_MS);
      }
    }

    this.syncPlayerVisual(this.player.moving || Boolean(pressed));
  }

  getEnemyTarget(enemy) {
    const playerCell = { row: this.player.row, col: this.player.col };

    if (enemy.ai === 'cutter') {
      // Aim for the cell a few steps ahead of where Spin is facing.
      const dir = DIRS[this.facing];
      let target = playerCell;
      for (let step = 1; step <= 4; step += 1) {
        const next = { row: playerCell.row + dir.dy * step, col: playerCell.col + dir.dx * step };
        if (!this.maze.isWalkable(next.row, next.col)) {
          break;
        }
        target = next;
      }
      return manhattan(enemy, playerCell) <= 2 ? playerCell : target;
    }

    if (enemy.ai === 'drifter' && manhattan(enemy, playerCell) > 6) {
      return null;
    }

    return playerCell;
  }

  handleEnemyMovement(now) {
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) {
        return;
      }

      this.advanceEntity(enemy, now);
      enemy.shadow.setPosition(enemy.sprite.x, enemy.sprite.y + (enemy.type === 'brute' ? 26 : 20));

      if (enemy.moving) {
        return;
      }

      const target = this.getEnemyTarget(enemy);
      const neighbors = shuffle(this.maze.getNeighbors(enemy.row, enemy.col));
      let nextStep;

      if (!target) {
        // Wander without doubling back unless it's a dead end.
        const forward = neighbors.filter(
          (cell) => !enemy.lastStep || cell.dx !== -enemy.lastStep.dx || cell.dy !== -enemy.lastStep.dy
        );
        nextStep = forward[0] ?? neighbors[0];
      } else {
        nextStep = this.maze.findNextStep({ row: enemy.row, col: enemy.col }, target);
        if (enemy.type === 'goon' && this.mode === 'music' && Math.random() < 0.2 && neighbors.length) {
          nextStep = neighbors[0];
        }
      }

      if (!nextStep || (nextStep.row === enemy.row && nextStep.col === enemy.col)) {
        return;
      }

      enemy.lastStep = { dx: nextStep.col - enemy.col, dy: nextStep.row - enemy.row };
      if (enemy.lastStep.dx) {
        enemy.sprite.setFlipX(enemy.lastStep.dx < 0);
      }
      this.startEntityMove(enemy, nextStep, now, this.getEnemyMoveDuration(enemy));
    });
  }

  getEnemyMoveDuration(enemy) {
    // Goons rush while the station is on dead air or talk, and ease off when music plays.
    const base = this.mode === 'music' ? 430 : 290;
    const scaled = Math.max(160, base - this.aggressionLevel * 30);
    return enemy.type === 'brute' ? scaled * 1.55 : scaled;
  }

  // ---------- Combat ----------

  updateBullets(delta) {
    const survivors = [];

    this.bullets.forEach((bullet) => {
      const previous = { x: bullet.sprite.x, y: bullet.sprite.y };
      const next = {
        x: previous.x + bullet.dir.dx * bullet.speed * (delta / 1000),
        y: previous.y + bullet.dir.dy * bullet.speed * (delta / 1000)
      };
      bullet.sprite.setPosition(next.x, next.y);

      const cell = worldToCell(next.x, next.y);
      const char = this.maze.charAt(cell.row, cell.col);
      if (char === 'E' && this.engineHp > 0) {
        bullet.sprite.destroy();
        this.damageEngine(next.x, next.y);
        return;
      }
      if (char !== '.') {
        this.burst(next.x, next.y, TIER_COLORS[this.activityTier].glow, 3);
        bullet.sprite.destroy();
        return;
      }

      const hitEnemy = this.enemies.find(
        (enemy) =>
          enemy.alive &&
          distancePointToSegment(enemy.sprite, previous, next) <= enemy.spec.hitRadius + bullet.radius
      );
      if (hitEnemy) {
        bullet.sprite.destroy();
        this.hitEnemy(hitEnemy);
        return;
      }

      survivors.push(bullet);
    });

    this.bullets = survivors;
  }

  hitEnemy(enemy) {
    enemy.hp -= 1;
    if (enemy.hp > 0) {
      enemy.sprite.setTintFill(0xffffff);
      this.time.delayedCall(70, () => enemy.sprite.clearTint());
      this.burst(enemy.sprite.x, enemy.sprite.y, 0xffffff, 4);
      return;
    }
    this.dropEnemy(enemy);
  }

  dropEnemy(enemy) {
    const { x, y } = enemy.sprite;
    enemy.alive = false;
    enemy.moving = false;
    enemy.sprite.setVisible(false);
    enemy.shadow.setVisible(false);
    this.score += enemy.spec.score;
    this.kills += 1;
    this.floorKills += 1;
    this.aggressionLevel = Math.min(5, this.floor.baseAggression + Math.floor(this.floorKills / 6));
    this.floatText(x, y - 18, `+${enemy.spec.score}`, '#ffffff');
    this.burst(x, y, enemy.type === 'brute' ? 0xff4d6d : 0x9b5cff, enemy.type === 'brute' ? 14 : 9);

    const droppedAmmo = enemy.type === 'brute' || Math.random() < AMMO_DROP_CHANCE;
    if (droppedAmmo) {
      this.spawnAmmoPickup(enemy.row, enemy.col);
    }
    this.statusText =
      enemy.type === 'brute'
        ? 'Clef Brute down. He left a battery behind.'
        : droppedAmmo
          ? 'Clef Goon down. Battery on the floor.'
          : 'Clef Goon down.';
    this.pushHud();
    this.time.delayedCall(RESPAWN_MS, () => this.respawnEnemy(enemy));
  }

  respawnEnemy(enemy) {
    if (this.isGameOver || !enemy.sprite.active) {
      return;
    }
    // Come back at whichever spawn is furthest from Spin so nobody gets spawn-camped.
    const playerCell = { row: this.player.row, col: this.player.col };
    const spawn = [...this.floor.spawns].sort(
      (a, b) => manhattan(b, playerCell) - manhattan(a, playerCell)
    )[Math.floor(Math.random() * 2)];
    const pos = cellToWorld(spawn.row, spawn.col);

    enemy.row = spawn.row;
    enemy.col = spawn.col;
    enemy.hp = enemy.spec.hp;
    enemy.moving = false;
    enemy.lastStep = null;
    enemy.alive = true;
    enemy.harmlessUntil = this.time.now + 700;
    enemy.sprite.setPosition(pos.x, pos.y).setVisible(true).setAlpha(0).clearTint();
    enemy.shadow.setVisible(true);
    this.tweens.add({ targets: enemy.sprite, alpha: 1, duration: 600 });
  }

  damageEngine(x, y) {
    this.engineHp -= 1;
    this.score += 10;
    this.burst(x, y, 0xff4d6d, 5);
    this.engineSprite?.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.engineSprite?.clearTint());

    if (this.engineHp <= 0) {
      this.destroyEngine();
    } else if (this.engineHp % 6 === 0) {
      this.statusText = `Dead Air Engine at ${Math.round((this.engineHp / this.floor.engineHp) * 100)}%. Keep it loud.`;
    }
    this.pushHud();
  }

  destroyEngine() {
    this.transitioning = true;
    this.score += 1000;
    this.statusText = 'The Dead Air Engine is coming apart!';
    this.clearBullets();
    this.enemies.forEach((enemy) => {
      enemy.alive = false;
      this.tweens.add({ targets: [enemy.sprite, enemy.shadow], alpha: 0, duration: 500 });
    });

    const engine = this.engineSprite;
    const centerX = engine.x + engine.displayWidth / 2;
    const centerY = engine.y + engine.displayHeight / 2;
    engine.stop();
    this.cameras.main.shake(1400, 0.008);
    for (let index = 0; index < 8; index += 1) {
      this.time.delayedCall(index * 160, () => {
        this.burst(
          centerX + Phaser.Math.Between(-60, 60),
          centerY + Phaser.Math.Between(-40, 40),
          index % 2 ? 0xffd23f : 0xff4d6d,
          12
        );
      });
    }
    this.time.delayedCall(1300, () => {
      this.cameras.main.flash(500, 255, 255, 255);
      engine.setVisible(false);
      this.burst(centerX, centerY, 0xffffff, 30);
    });

    if (this.bassoliniSprite) {
      this.tweens.add({
        targets: this.bassoliniSprite,
        x: this.bassoliniSprite.x + 70,
        alpha: 0,
        delay: 900,
        duration: 900,
        ease: 'Quad.easeIn'
      });
    }

    this.time.delayedCall(2600, () => {
      this.isGameOver = true;
      this.pushHud();
      this.onVictory?.(this.getRunSummary());
    });
    this.pushHud();
  }

  completeFloor() {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    this.score += 250;
    this.statusText = `${this.floor.name} cleared. Going down.`;
    this.clearBullets();
    this.pushHud();

    this.tweens.add({
      targets: [this.player.sprite, this.player.tuneRay, this.player.shadow],
      alpha: 0,
      duration: 500
    });
    this.elevatorSprite?.setTexture('elevator-closed');
    this.time.delayedCall(800, () => {
      if (this.isGameOver) {
        return;
      }
      this.loadFloor(Math.min(this.floorIndex + 1, FLOORS.length - 1));
    });
  }

  checkEnemyContact(now) {
    if (now < this.invulnerableUntil) {
      return;
    }

    const attacker = this.enemies.find(
      (enemy) =>
        enemy.alive &&
        now >= enemy.harmlessUntil &&
        Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          this.player.sprite.x,
          this.player.sprite.y
        ) < enemy.spec.contact
    );
    if (!attacker) {
      return;
    }

    this.hp -= 1;
    this.cameras.main.shake(220, 0.01);
    this.cameras.main.flash(140, 255, 77, 109, false);

    if (this.hp <= 0) {
      this.endRun(
        attacker.type === 'brute'
          ? 'A Clef Brute flattened Spin.'
          : 'The Clef Goons caught Spin.'
      );
      return;
    }

    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.tweens.add({
      targets: [this.player.sprite, this.player.tuneRay],
      alpha: 0.25,
      yoyo: true,
      repeat: 7,
      duration: 100,
      onComplete: () => {
        this.player.sprite.setAlpha(1);
        this.player.tuneRay.setAlpha(1);
      }
    });
    // The goon that landed the hit gets bounced back to a spawn.
    attacker.alive = false;
    attacker.sprite.setVisible(false);
    attacker.shadow.setVisible(false);
    this.time.delayedCall(RESPAWN_MS, () => this.respawnEnemy(attacker));
    this.statusText = `Signal bar lost. ${this.hp} left.`;
    this.pushHud();
  }

  endRun(reason) {
    this.isGameOver = true;
    this.clearBullets();
    this.player.sprite.setTintFill(0xff4d6d);
    this.statusText = reason;
    this.pushHud();
    this.onGameOver?.({ reason, ...this.getRunSummary() });
  }

  getRunSummary() {
    return {
      score: this.score,
      kills: this.kills,
      recordsTotal: this.recordsTotal,
      floorIndex: this.floorIndex,
      floorLabel: this.floor.label,
      floorName: this.floor.name
    };
  }

  clearBullets() {
    this.bullets?.forEach(({ sprite }) => sprite.destroy());
    this.bullets = [];
  }

  // ---------- Effects ----------

  floatText(x, y, text, color) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color,
        stroke: '#15111f',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
    this.tweens.add({
      targets: label,
      y: y - 26,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy()
    });
  }

  burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.5;
      const distance = Phaser.Math.Between(10, 30);
      const size = Phaser.Math.Between(1, 2) * PIXEL_SCALE;
      const spark = this.add.rectangle(x, y, size, size, color, 1).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(260, 460),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  pushHud() {
    this.onHudChange?.({
      stationName: this.station.name,
      stationTagline: this.station.tagline,
      broadcastMode: this.mode,
      powerModeTitle: this.powerMode.title,
      powerScore: Number(this.powerScore.toFixed(2)),
      activityTier: this.activityTier,
      activityReason: this.activityReason,
      gameMode: this.gameMode,
      pulseLocked: this.pulseLocked,
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
      score: this.score,
      kills: this.kills,
      ammo: this.ammo,
      hp: this.hp,
      maxHp: MAX_HP,
      aggressionLevel: this.aggressionLevel,
      floorIndex: this.floorIndex,
      floorCount: FLOORS.length,
      floorLabel: this.floor.label,
      floorName: this.floor.name,
      floorTheme: this.floor.theme,
      floorObjective: this.floor.objective,
      floorRecords: this.floorRecords,
      recordsToOpen: this.floor.recordsToOpen,
      recordsTotal: this.recordsTotal,
      elevatorOpen: this.elevatorOpen,
      engineHp: this.engineHp,
      engineMaxHp: this.floor.engineHp ?? 0,
      paused: this.isPaused,
      statusText: this.statusText
    });
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused || this.awaitingStart || this.transitioning) {
      return;
    }

    // Holding Space keeps firing at the current cadence; key repeats don't re-emit keydown.
    if (this.keys.space.isDown) {
      this.fireBullet();
    }

    this.handlePlayerMovement(time);
    if (this.transitioning) {
      return;
    }
    this.handleEnemyMovement(time);
    this.updateBullets(delta);
    this.checkRecordPickup();
    this.checkAmmoPickup();
    this.checkEnemyContact(time);
  }
}
