
export const CANVAS_WIDTH = 512;
export const CANVAS_HEIGHT = 448;
export const VIRTUAL_WIDTH = 256;
export const VIRTUAL_HEIGHT = 224;

export const LANE_HEIGHT = 20;
export const TRACK_TOP = 60;
export const TRACK_BOTTOM = TRACK_TOP + (LANE_HEIGHT * 4);

export const MAX_SPEED = 4.8;
export const TURBO_SPEED = 6.4;
export const ACCELERATION = 0.055;
export const FRICTION = 0.022;
export const GRAVITY = 0.16;
export const JUMP_FORCE = 3.6;

export const MAX_HEAT = 100;
export const HEAT_INC = 0.22;
export const HEAT_COOL = 0.14;
export const OVERHEAT_PENALTY_TIME = 160;

export const STAGE_LENGTH = 5000; // 5000m (score units). World physical length is STAGE_LENGTH * 10.

export const COLORS = {
  TRACK: '#6d4c41',
  LANE_MARKER: '#ffffff44',
  BIKE_BODY: '#e53935',
  BIKE_WHEEL: '#1a1a1a',
  GOLD_TRIM: '#ffd700',
  PLATINUM_TRIM: '#e5e4e2'
};

export const RETRO_PALETTE = [
  '#e53935', // Red
  '#1e88e5', // Blue
  '#43a047', // Green
  '#fdd835', // Yellow
  '#8e24aa', // Purple
  '#fb8c00', // Orange
  '#d81b60', // Pink
  '#00acc1', // Cyan
  '#455a64'  // Dark Gray
];

export const THEME_COLORS = {
  DAY: { sky: '#4fc3f7', mountain: '#0a1a3a', grass: '#388e3c', ambient: '#ffffff' },
  DUSK: { sky: '#5e35b1', mountain: '#311b92', grass: '#2e7d32', ambient: '#ffccbc' },
  NIGHT: { sky: '#0d1117', mountain: '#000000', grass: '#1b5e20', ambient: '#9fa8da' },
  STORM: { sky: '#455a64', mountain: '#263238', grass: '#2e7d32', ambient: '#cfd8dc' }
};

export const UPGRADES = {
  engine: [
    { name: "STOCK MOTOR", cost: 0, speedMult: 1.0, accelMult: 1.0 },
    { name: "PRO TUNED", cost: 2500, speedMult: 1.15, accelMult: 1.1 },
    { name: "ELITE BORE", cost: 8000, speedMult: 1.3, accelMult: 1.25 }
  ],
  cooling: [
    { name: "STOCK AIR", cost: 0, heatMult: 1.0 },
    { name: "LIQUID COOLED", cost: 3000, heatMult: 0.75 },
    { name: "CRYO SINKS", cost: 7500, heatMult: 0.5 }
  ],
  turbo: [
    { name: "STOCK PUMP", cost: 0, turboMult: 1.0 },
    { name: "NITRO BOOST", cost: 4000, turboMult: 1.2 },
    { name: "WARP INJECTOR", cost: 9000, turboMult: 1.45 }
  ]
};