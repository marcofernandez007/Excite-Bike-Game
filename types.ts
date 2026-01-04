
export enum GameState {
  MENU = 'MENU',
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GARAGE = 'GARAGE'
}

export enum GameMode {
  SINGLE = 'SINGLE',
  TWO_PLAYER = 'TWO_PLAYER',
  ONLINE = 'ONLINE'
}

export enum StageTheme {
  DAY = 'DAY',
  DUSK = 'DUSK',
  NIGHT = 'NIGHT',
  STORM = 'STORM'
}

export type Lane = 0 | 1 | 2 | 3;

export interface BikeUpgrades {
  engine: number; // 0: Stock, 1: Pro, 2: Elite
  cooling: number; 
  turbo: number;
  color: string;
}

export interface Player {
  id: number;
  x: number;
  y: number;
  lane: Lane;
  targetLane: Lane;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  totalJumpRotation: number;
  isJumping: boolean;
  vz: number;
  z: number;
  heat: number;
  isCrashed: boolean;
  crashTimer: number;
  score: number;
  crashCount: number;
  flipsInCurrentJump: number;
  comboMultiplier: number;
  isRemote?: boolean;
  upgrades?: BikeUpgrades;
}

export interface NPC {
  id: number;
  x: number;
  y: number;
  lane: Lane;
  targetLane: Lane;
  speed: number;
  baseSpeed: number;
  z: number;
  vz: number;
  isJumping: boolean;
  color: string;
  isCrashed: boolean;
  crashTimer: number;
}

export enum ObstacleType {
  BUMP = 'BUMP',
  RAMP = 'RAMP',
  MUD = 'MUD',
  BIG_RAMP = 'BIG_RAMP',
  OIL_SLICK = 'OIL_SLICK',
  HURDLE = 'HURDLE',
  WATER = 'WATER',
  GRAVEL = 'GRAVEL'
}

export interface Obstacle {
  x: number;
  lane: Lane;
  type: ObstacleType;
}

export interface TrackSegment {
  x: number;
  minLane: number;
  maxLane: number;
  yOffset: number;
}
