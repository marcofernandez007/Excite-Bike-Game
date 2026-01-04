
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  GameState, GameMode, Player, NPC, Lane, Obstacle, ObstacleType, TrackSegment, StageTheme, BikeUpgrades 
} from '../types';
import { 
  VIRTUAL_WIDTH, VIRTUAL_HEIGHT, TRACK_TOP, TRACK_BOTTOM, LANE_HEIGHT, 
  MAX_SPEED, TURBO_SPEED, ACCELERATION, FRICTION, 
  GRAVITY, JUMP_FORCE, MAX_HEAT, HEAT_INC, HEAT_COOL, OVERHEAT_PENALTY_TIME,
  COLORS, THEME_COLORS, STAGE_LENGTH, UPGRADES
} from '../constants';
import { audioService } from '../services/audioService';
import { getCommentary } from '../services/geminiService';

export interface GameCanvasHandle {
  handleExternalKeyDown: (code: string) => void;
  handleExternalKeyUp: (code: string) => void;
}

interface GameCanvasProps {
  gameState: GameState;
  gameMode: GameMode;
  theme: StageTheme;
  stageIndex: number;
  onGameOver: (results: {score: number, crashes: number}[]) => void;
  onLevelComplete: (results: {score: number, crashes: number}[]) => void;
  multiplayer?: { peer: any, conn: any, isHost: boolean } | null;
  upgrades?: BikeUpgrades;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isWeather?: boolean;
}

interface VisualFeedback {
  x: number;
  y: number;
  text: string;
  life: number;
  color?: string;
}

const NPC_COLORS = ['#9c27b0', '#00bcd4', '#ff9800', '#e91e63', '#ffeb3b', '#607d8b'];

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ 
  gameState, gameMode, theme, stageIndex, onGameOver, onLevelComplete, multiplayer, upgrades 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const [commentary, setCommentary] = useState<string>(`STAGE ${stageIndex + 1} - READY?`);
  const [shake, setShake] = useState(0);
  const [feedbacks, setFeedbacks] = useState<VisualFeedback[]>([]);
  const lightningRef = useRef(0);
  
  const createPlayer = (id: number): Player => ({
    id,
    x: 20,
    y: TRACK_TOP + LANE_HEIGHT * (id % 4) + 10,
    lane: (id % 4) as Lane,
    targetLane: (id % 4) as Lane,
    speed: 0,
    rotation: 0,
    rotationSpeed: 0,
    totalJumpRotation: 0,
    isJumping: false,
    vz: 0,
    z: 0,
    heat: 0,
    isCrashed: false,
    crashTimer: 0,
    score: 0,
    crashCount: 0,
    flipsInCurrentJump: 0,
    comboMultiplier: 1,
    upgrades: upgrades ? { ...upgrades } : { engine: 0, cooling: 0, turbo: 0, color: COLORS.BIKE_BODY }
  });

  const playersRef = useRef<Player[]>([]);

  useEffect(() => {
    if (gameMode === GameMode.SINGLE) {
      playersRef.current = [createPlayer(0)];
    } else {
      playersRef.current = [createPlayer(0), createPlayer(1)];
    }
  }, [gameMode]);

  const npcsRef = useRef<NPC[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trackSegmentsRef = useRef<TrackSegment[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const gameFrameRef = useRef(0);
  const lastCommentaryScoreRef = useRef(0);

  useEffect(() => {
    if (upgrades && playersRef.current.length > 0) {
      playersRef.current.forEach((p, idx) => {
        const isLocal = gameMode !== GameMode.ONLINE || (multiplayer?.isHost && idx === 0) || (!multiplayer?.isHost && idx === 1);
        if (isLocal) {
          p.upgrades = { ...upgrades };
        }
      });
      
      if (gameMode === GameMode.ONLINE && multiplayer?.conn) {
        const myIndex = multiplayer.isHost ? 0 : 1;
        multiplayer.conn.send({ type: 'SYNC_STATE', state: { ...playersRef.current[myIndex] } });
      }
    }
  }, [upgrades, gameMode, multiplayer]);

  useImperativeHandle(ref, () => ({
    handleExternalKeyDown: (code: string) => keysRef.current.add(code),
    handleExternalKeyUp: (code: string) => keysRef.current.delete(code)
  }));

  const spawnParticles = (x: number, y: number, z: number, count: number, type: 'dust' | 'spark' | 'smoke' | 'water' | 'stone' | 'mud') => {
    for (let i = 0; i < count; i++) {
      let color = '#fff';
      let vx = (Math.random() - 0.5) * 2;
      let vy = (Math.random() - 0.5) * 1;
      let vz = Math.random() * 2;
      let life = 20 + Math.random() * 20;
      let size = 1;
      if (type === 'dust') {
        color = i % 2 === 0 ? '#d7b899' : '#bcaaa4';
        vx = -Math.random() * 1.5 - 0.5;
        vz = Math.random() * 0.8;
        life = 8 + Math.random() * 12;
      } else if (type === 'mud') {
        color = '#3e2723';
        vx = (Math.random() - 0.5) * 3;
        vz = 0.5 + Math.random() * 2;
        life = 8 + Math.random() * 12;
        size = 1.5;
      } else if (type === 'spark') {
        color = i % 2 === 0 ? '#ffff00' : '#ff9800';
        vx = (Math.random() - 0.5) * 5;
        vz = 1 + Math.random() * 4;
        life = 10 + Math.random() * 15;
      } else if (type === 'smoke') {
        color = i % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(200,200,200,0.3)';
        vz = 0.5 + Math.random() * 1;
        life = 30 + Math.random() * 30;
        size = 2;
      } else if (type === 'water') {
        color = i % 2 === 0 ? '#e1f5fe' : '#b3e5fc';
        vx = (Math.random() - 0.5) * 3;
        vz = 1 + Math.random() * 3;
        life = 15 + Math.random() * 10;
        size = 1.5;
      } else if (type === 'stone') {
        color = i % 2 === 0 ? '#757575' : '#424242';
        vx = -Math.random() * 4;
        vz = 0.5 + Math.random() * 2;
        life = 12 + Math.random() * 10;
        size = 1.2;
      }
      particlesRef.current.push({
        x, y, z, vx, vy, vz, life, maxLife: life, color, size
      });
    }
  };

  const getTrackLayoutAt = (x: number): TrackSegment => {
    const segments = trackSegmentsRef.current;
    if (segments.length === 0) return { x: 0, minLane: 0, maxLane: 3, yOffset: 0 };
    let left = 0, right = segments.length - 1;
    let found = segments[0];
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (segments[mid].x <= x) {
        found = segments[mid];
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return found;
  };

  const generateTrack = useCallback(() => {
    if (gameMode === GameMode.ONLINE && multiplayer && !multiplayer.isHost) return;

    const segments: TrackSegment[] = [];
    let currentX = 0;
    let currentYOffset = 0;
    segments.push({ x: 0, minLane: 0, maxLane: 3, yOffset: 0 });
    currentX = 1000;
    
    const complexSegments = 0.3 + (stageIndex * 0.1);
    const worldLength = STAGE_LENGTH * 10;

    while (currentX < worldLength + 2000) {
      const type = Math.random();
      const length = 400 + Math.random() * 800;
      if (type < complexSegments * 0.5) {
        const laneCount = stageIndex >= 2 ? 1 : 2; 
        const minLane = Math.floor(Math.random() * (4 - laneCount));
        segments.push({ x: currentX, minLane, maxLane: minLane + laneCount - 1, yOffset: currentYOffset });
      } else if (type < complexSegments) {
        currentYOffset = Math.max(-20, Math.min(20, currentYOffset + (Math.random() > 0.5 ? 10 : -10)));
        segments.push({ x: currentX, minLane: 0, maxLane: 3, yOffset: currentYOffset });
      } else {
        segments.push({ x: currentX, minLane: 0, maxLane: 3, yOffset: currentYOffset });
      }
      currentX += length;
    }
    trackSegmentsRef.current = segments;

    const obs: Obstacle[] = [];
    for (let x = 600; x < worldLength; x += (180 - stageIndex * 15) + Math.random() * 400) {
      const layout = getTrackLayoutAt(x);
      const lane = (layout.minLane + Math.floor(Math.random() * (layout.maxLane - layout.minLane + 1))) as Lane;
      const types = Object.values(ObstacleType);
      
      let type: ObstacleType;
      if (theme === StageTheme.STORM && Math.random() > 0.5) {
          type = Math.random() > 0.5 ? ObstacleType.WATER : ObstacleType.MUD;
      } else if (theme === StageTheme.NIGHT && Math.random() > 0.4) {
          type = ObstacleType.HURDLE;
      } else {
          type = types[Math.floor(Math.random() * types.length)];
      }
      
      obs.push({ x, lane, type });
    }
    obstaclesRef.current = obs;

    const npcs: NPC[] = [];
    for (let i = 0; i < 4; i++) {
        const lane = (i % 4) as Lane;
        npcs.push({
            id: i,
            x: 200 + (i * 120),
            y: TRACK_TOP + lane * LANE_HEIGHT + 10,
            lane, targetLane: lane, speed: 3.5, baseSpeed: 3.5 + (stageIndex * 0.3) + Math.random() * 0.5,
            z: 0, vz: 0, isJumping: false, color: NPC_COLORS[i % NPC_COLORS.length], isCrashed: false, crashTimer: 0
        });
    }
    npcsRef.current = npcs;

    if (gameMode === GameMode.ONLINE && multiplayer?.isHost) {
        multiplayer.conn.send({ 
            type: 'INIT_TRACK', 
            data: { segments: trackSegmentsRef.current, obstacles: obstaclesRef.current, npcs: npcsRef.current } 
        });
    }
  }, [gameMode, multiplayer, stageIndex, theme]);

  useEffect(() => {
    generateTrack();
    if (gameMode === GameMode.ONLINE && multiplayer?.conn) {
        const handleData = (data: any) => {
            if (data.type === 'INIT_TRACK') {
                trackSegmentsRef.current = data.data.segments;
                obstaclesRef.current = data.data.obstacles;
                npcsRef.current = data.data.npcs;
            } else if (data.type === 'SYNC_STATE') {
                const remoteIndex = multiplayer.isHost ? 1 : 0;
                const remotePlayer = playersRef.current[remoteIndex];
                if (remotePlayer) Object.assign(remotePlayer, data.state);
            }
        };
        multiplayer.conn.on('data', handleData);
        return () => { multiplayer.conn.off('data', handleData); };
    }
  }, [generateTrack, gameMode, multiplayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      audioService.stopEngine();
    };
  }, []);

  const checkEntityCollisions = (player: Player, index: number) => {
    if (player.isCrashed) return;

    const others = [
        ...playersRef.current.map((p, i) => ({ ...p, isPlayer: true, originalIndex: i })),
        ...npcsRef.current.map(n => ({ ...n, isPlayer: false, originalIndex: n.id }))
    ].filter(e => !(e.isPlayer && e.originalIndex === index));

    for (const other of others) {
      if (other.isCrashed) continue;

      const dx = other.x - player.x;
      const dy = Math.abs(player.y - other.y);
      const dz = Math.abs(player.z - other.z);

      if (Math.abs(dx) < 14 && dy < 12 && dz < 8) {
        const isPlayerBehind = dx > 0;

        if (isPlayerBehind) {
            player.isCrashed = true;
            player.crashTimer = 90;
            player.speed = 0;
            player.crashCount++;
            player.comboMultiplier = 1;
            setShake(12);
            spawnParticles(player.x, player.y, 5, 20, 'spark');
            audioService.playCrash();
            setFeedbacks(f => [...f, { x: player.x, y: player.y - 20, text: 'BONK!', life: 40, color: '#f44336' }]);
        } else {
            if (other.isPlayer) {
                const target = playersRef.current[other.originalIndex];
                if (target) {
                  target.isCrashed = true;
                  target.crashTimer = 90;
                  target.speed = 0;
                  target.crashCount++;
                }
            } else {
                const target = npcsRef.current.find(n => n.id === other.originalIndex);
                if (target) {
                    target.isCrashed = true;
                    target.crashTimer = 110;
                    target.speed = 0;
                }
            }
            setShake(8);
            spawnParticles(other.x, other.y, 5, 20, 'spark');
            audioService.playBeep(220, 0.1); 
            setFeedbacks(f => [...f, { x: player.x, y: player.y - 30, text: 'BLOCKED!', life: 40, color: '#4caf50' }]);
        }
      }
    }
  };

  const updatePlayer = (player: Player, index: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (gameMode === GameMode.ONLINE && multiplayer) {
        const isRemote = (multiplayer.isHost && index === 1) || (!multiplayer.isHost && index === 0);
        if (isRemote) return;
    }

    const layout = getTrackLayoutAt(player.x);
    const isPlayer1 = index === 0;
    const controls = isPlayer1 ? {
      up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', gas: 'KeyZ', turbo: 'KeyX'
    } : {
      up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', gas: 'KeyF', turbo: 'KeyG'
    };

    const isStorm = theme === StageTheme.STORM;
    const engineMod = UPGRADES.engine[player.upgrades?.engine || 0];
    const coolingMod = UPGRADES.cooling[player.upgrades?.cooling || 0];
    const turboMod = UPGRADES.turbo[player.upgrades?.turbo || 0];
    
    const gripFactor = isStorm ? 0.75 : 1.0;
    const currentFriction = isStorm ? FRICTION * 0.6 : FRICTION;
    const laneResponsiveness = isStorm ? 0.12 : 0.18;

    if (!player.isCrashed) {
      if (keysRef.current.has(controls.up) && player.targetLane > layout.minLane && !player.isJumping) {
        player.targetLane--; keysRef.current.delete(controls.up);
      }
      if (keysRef.current.has(controls.down) && player.targetLane < layout.maxLane && !player.isJumping) {
        player.targetLane++; keysRef.current.delete(controls.down);
      }
    }
    player.targetLane = Math.max(layout.minLane, Math.min(layout.maxLane, player.targetLane)) as Lane;
    const targetY = TRACK_TOP + layout.yOffset + (player.targetLane * LANE_HEIGHT) + 10;
    player.y += (targetY - player.y) * laneResponsiveness;
    player.lane = Math.round((player.y - layout.yOffset - TRACK_TOP - 10) / LANE_HEIGHT) as Lane;

    const isGas = keysRef.current.has(controls.gas);
    const isTurbo = keysRef.current.has(controls.turbo);

    if (player.isCrashed) {
      player.speed *= 0.94;
      player.crashTimer--;
      if (gameFrameRef.current % 5 === 0) spawnParticles(player.x, player.y, 0, 1, 'spark');
      if (player.crashTimer <= 0) { player.isCrashed = false; player.heat = 0; }
    } else {
      if (player.speed > 0.5 && !player.isJumping && !player.isCrashed) {
          const spawnChance = player.speed / MAX_SPEED;
          if (Math.random() < spawnChance * 0.4) {
              spawnParticles(player.x - 12, player.y + 6, 0, 1, isStorm ? 'water' : 'dust');
          }
      }

      if (isTurbo && player.heat < MAX_HEAT) {
        player.speed += ACCELERATION * 1.5 * (engineMod.accelMult || 1.0) * gripFactor;
        player.heat += HEAT_INC * 1.3 * (coolingMod.heatMult || 1.0);
        if (gameFrameRef.current % 4 === 0) spawnParticles(player.x - 14, player.y, 0, 1, isStorm ? 'water' : 'smoke');
        if (player.heat >= MAX_HEAT) {
          player.isCrashed = true; player.crashTimer = OVERHEAT_PENALTY_TIME; player.crashCount++; player.comboMultiplier = 1; setShake(12);
          spawnParticles(player.x, player.y, 10, 20, 'spark');
          setFeedbacks(f => [...f, { x: player.x, y: player.y - 20, text: 'OVERHEAT!', life: 60, color: '#f44336' }]);
          audioService.playCrash();
        }
      } else if (isGas) {
        player.speed += ACCELERATION * (engineMod.accelMult || 1.0) * gripFactor;
        player.heat = Math.max(0, player.heat - HEAT_COOL * 0.5);
      } else {
        player.speed -= currentFriction;
        player.heat = Math.max(0, player.heat - HEAT_COOL);
      }
      
      const limitBase = isTurbo ? TURBO_SPEED * (turboMod.turboMult || 1.0) : MAX_SPEED * (engineMod.speedMult || 1.0);
      player.speed = Math.max(0, Math.min(player.speed, limitBase));
    }
    player.x += player.speed;
    player.score = Math.floor(player.x / 10);

    checkEntityCollisions(player, index);

    if (player.score >= STAGE_LENGTH) {
        onLevelComplete(playersRef.current.map(p => ({ score: p.score, crashes: p.crashCount })));
    }

    if (player.isJumping) {
      player.vz -= GRAVITY; 
      player.z += player.vz;

      let rotating = false;
      if (keysRef.current.has(controls.left)) {
        player.rotationSpeed -= 0.022;
        rotating = true;
      }
      if (keysRef.current.has(controls.right)) {
        player.rotationSpeed += 0.022;
        rotating = true;
      }

      if (!rotating) {
        const targetRot = Math.round(player.rotation / (Math.PI * 2)) * (Math.PI * 2);
        player.rotation += (targetRot - player.rotation) * 0.08;
        player.rotationSpeed *= 0.85; 
      } else {
        player.rotationSpeed *= 0.98; 
      }

      player.rotation += player.rotationSpeed;
      player.totalJumpRotation += Math.abs(player.rotationSpeed);
      
      const currentFlipCount = Math.floor(player.totalJumpRotation / (Math.PI * 2));
      if (currentFlipCount > player.flipsInCurrentJump) {
        player.flipsInCurrentJump = currentFlipCount;
        setFeedbacks(f => [...f, { x: player.x, y: player.y - 40, text: currentFlipCount > 1 ? `${currentFlipCount}x FLIP!` : "360!", life: 40, color: '#ffeb3b' }]);
        audioService.playFlipMidAir(currentFlipCount);
      }

      if (player.z <= 0) {
        player.z = 0; player.isJumping = false; player.vz = 0;
        spawnParticles(player.x, player.y + 4, 0, 12, isStorm ? 'water' : 'dust');
        
        const landingAngle = player.rotation % (Math.PI * 2);
        const normalizedAngle = ((landingAngle + Math.PI) % (Math.PI * 2)) - Math.PI;

        if (Math.abs(normalizedAngle) > 0.85) {
          player.isCrashed = true; player.crashTimer = 75; player.speed = 0; player.crashCount++; player.comboMultiplier = 1; setShake(18);
          spawnParticles(player.x, player.y, 0, 25, 'spark');
          setFeedbacks(f => [...f, { x: player.x, y: player.y - 20, text: 'WIPEOUT!', life: 60, color: '#f44336' }]);
          audioService.playCrash();
        } else {
            player.rotation = 0;
            if (player.flipsInCurrentJump > 0) {
              player.comboMultiplier++;
              const bonus = player.flipsInCurrentJump * 500 * player.comboMultiplier;
              player.score += bonus;
              setFeedbacks(f => [...f, { x: player.x, y: player.y - 30, text: `STUCK IT! x${player.comboMultiplier} +${bonus}`, life: 60, color: '#4caf50' }]);
              audioService.playFlipLanding(player.comboMultiplier);
            } else { audioService.playBeep(240, 0.04); }
        }
        player.rotationSpeed = 0; player.totalJumpRotation = 0; player.flipsInCurrentJump = 0;
      }
    } else { 
      player.rotation *= 0.82; 
      player.rotationSpeed = 0; 
      player.z = (player.z < 0 ? player.z : 0); 
    }

    obstaclesRef.current.forEach(obs => {
      const obsLayout = getTrackLayoutAt(obs.x);
      const obsY = TRACK_TOP + obsLayout.yOffset + (obs.lane * LANE_HEIGHT) + 10;
      if (Math.abs(player.x - obs.x) < 10 && Math.abs(player.y - obsY) < 7 && !player.isJumping && !player.isCrashed) {
        switch (obs.type) {
          case ObstacleType.MUD: 
            player.speed *= 0.60; player.z = -1.5; 
            if (gameFrameRef.current % 3 === 0) spawnParticles(player.x, player.y, 0, 2, 'mud'); 
            break;
          case ObstacleType.WATER: 
            player.speed *= 0.55; 
            if (gameFrameRef.current % 2 === 0) spawnParticles(player.x, player.y, 0, 2, 'water');
            break;
          case ObstacleType.OIL_SLICK: 
            player.speed *= 0.98; 
            player.rotationSpeed += (Math.random() - 0.5) * 0.45; 
            if (Math.random() < 0.05) { 
                const shift = Math.random() > 0.5 ? 1 : -1; 
                const newLane = player.targetLane + shift; 
                if (newLane >= layout.minLane && newLane <= layout.maxLane) player.targetLane = newLane as Lane; 
            } 
            break;
          case ObstacleType.GRAVEL: 
            player.speed *= 0.9; 
            player.heat += 0.06; 
            if (gameFrameRef.current % 2 === 0) spawnParticles(player.x, player.y, 0, 3, 'stone');
            break;
          case ObstacleType.BUMP: 
            player.isJumping = true; 
            player.vz = JUMP_FORCE * 0.75; 
            audioService.playJump(); 
            break;
          case ObstacleType.BIG_RAMP: 
            player.isJumping = true; 
            player.vz = JUMP_FORCE * 1.6; 
            audioService.playJump(); 
            break;
          case ObstacleType.RAMP: 
            player.isJumping = true; 
            player.vz = JUMP_FORCE; 
            audioService.playJump(); 
            break;
          case ObstacleType.HURDLE:
            if (player.speed > 2.2) { 
                player.isJumping = true; 
                player.vz = JUMP_FORCE * 0.55; 
                audioService.playJump(); 
            } else { 
                player.speed *= 0.35; 
                spawnParticles(player.x + 8, player.y, 0, 5, 'spark');
                audioService.playBeep(50, 0.1); 
            }
            break;
        }
      }
    });

    if (gameMode === GameMode.ONLINE && multiplayer?.conn && gameFrameRef.current % 2 === 0) {
        multiplayer.conn.send({ type: 'SYNC_STATE', state: { ...player } });
    }
  };

  const updateWeather = () => {
    if (theme === StageTheme.STORM) {
      for (let i = 0; i < 4; i++) {
        const mainPlayerIndex = (gameMode === GameMode.ONLINE && !multiplayer?.isHost) ? 1 : 0;
        const mainPlayer = playersRef.current[mainPlayerIndex];
        if (!mainPlayer) continue;
        const camX = mainPlayer.x - 60;
        const x = camX + Math.random() * (VIRTUAL_WIDTH + 150);
        const y = TRACK_TOP - 40 + Math.random() * (TRACK_BOTTOM - TRACK_TOP + 80);
        particlesRef.current.push({
          x, y, z: 120 + Math.random() * 40, vx: -2 - Math.random(), vy: 0, vz: -8 - Math.random() * 4,
          life: 25, maxLife: 25, color: 'rgba(180, 210, 255, 0.7)', size: 1, isWeather: true
        });
      }
      if (Math.random() < 0.003) { 
          lightningRef.current = 6;
          setShake(15);
          audioService.playThunder();
      }
    } else if (theme === StageTheme.DUSK) {
       if (Math.random() < 0.1) {
          const mainPlayerIndex = (gameMode === GameMode.ONLINE && !multiplayer?.isHost) ? 1 : 0;
          const mainPlayer = playersRef.current[mainPlayerIndex];
          if (!mainPlayer) return;
          const camX = mainPlayer.x - 60;
          particlesRef.current.push({
            x: camX + VIRTUAL_WIDTH + 10, y: TRACK_TOP + Math.random() * (TRACK_BOTTOM - TRACK_TOP),
            z: Math.random() * 30, vx: -0.5 - Math.random() * 0.5, vy: (Math.random() - 0.5) * 0.2,
            vz: (Math.random() - 0.5) * 0.1, life: 100, maxLife: 100, color: 'rgba(255, 204, 128, 0.3)', size: 1, isWeather: true
          });
       }
    }
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;
    if (playersRef.current.length === 0) return;

    gameFrameRef.current++;
    if (shake > 0) setShake(s => Math.max(0, s - 0.4));
    if (lightningRef.current > 0) lightningRef.current--;
    
    updateWeather();

    const mainPlayerIndex = (gameMode === GameMode.ONLINE && !multiplayer?.isHost) ? 1 : 0;
    const mainPlayer = playersRef.current[mainPlayerIndex];
    if (!mainPlayer) return;
    const camX = mainPlayer.x - 60;

    if (gameMode !== GameMode.ONLINE || multiplayer?.isHost) {
        npcsRef.current.forEach(npc => {
            const layout = getTrackLayoutAt(npc.x);
            if (npc.x < camX - 150) {
                npc.x = camX + VIRTUAL_WIDTH + 150 + Math.random() * 200;
                npc.isCrashed = false;
                npc.speed = npc.baseSpeed;
                npc.targetLane = Math.floor(Math.random() * 4) as Lane;
                npc.z = 0;
            }

            if (npc.isCrashed) {
                npc.speed *= 0.9; npc.crashTimer--;
                if (npc.crashTimer <= 0) { npc.isCrashed = false; npc.speed = npc.baseSpeed * 0.4; }
            } else {
                const distToPlayer = npc.x - mainPlayer.x;
                let targetSpeed = npc.baseSpeed;
                if (distToPlayer < -150) {
                    targetSpeed = mainPlayer.speed + 1.2;
                } else if (distToPlayer > 300) {
                    targetSpeed = npc.baseSpeed * 0.7;
                }
                npc.speed += (targetSpeed - npc.speed) * 0.05;

                if (gameFrameRef.current % 120 === 0 && !npc.isJumping) {
                    if (Math.random() > 0.6) {
                        const dir = Math.random() > 0.5 ? 1 : -1;
                        const nl = npc.targetLane + dir;
                        if (nl >= layout.minLane && nl <= layout.maxLane) {
                            npc.targetLane = nl as Lane;
                        }
                    }
                }
                
                npc.targetLane = Math.max(layout.minLane, Math.min(layout.maxLane, npc.targetLane)) as Lane;
                const targetY = TRACK_TOP + layout.yOffset + (npc.targetLane * LANE_HEIGHT) + 10;
                npc.y += (targetY - npc.y) * 0.08;
                npc.lane = Math.round((npc.y - layout.yOffset - TRACK_TOP - 10) / LANE_HEIGHT) as Lane;
                npc.x += npc.speed;

                if (npc.isJumping) { npc.vz -= GRAVITY; npc.z += npc.vz; if (npc.z <= 0) { npc.z = 0; npc.isJumping = false; npc.vz = 0; } }
                
                obstaclesRef.current.forEach(obs => {
                    if (Math.abs(npc.x - obs.x) < 5 && npc.lane === obs.lane && !npc.isJumping) {
                        if (obs.type === ObstacleType.RAMP || obs.type === ObstacleType.BIG_RAMP || obs.type === ObstacleType.BUMP) {
                            npc.isJumping = true;
                            npc.vz = JUMP_FORCE * (obs.type === ObstacleType.BIG_RAMP ? 1.4 : 1.0);
                        }
                    }
                });
            }
        });
    }

    playersRef.current.forEach(updatePlayer);
    
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx; p.y += p.vy; p.z += p.vz;
      if (!p.isWeather) p.vz -= 0.1;
      p.life--;
      if (p.z < 0 && p.z > -1 && !p.isWeather) { p.z = 0; p.vz *= -0.5; p.vx *= 0.8; }
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }
    setFeedbacks(prev => prev.map(f => ({ ...f, y: f.y - 0.4, life: f.life - 1 })).filter(f => f.life > 0));

    const currentMain = playersRef.current[mainPlayerIndex];
    if (currentMain && !currentMain.isCrashed) audioService.playEngine(currentMain.speed, currentMain.heat);
    else audioService.stopEngine();

    if (currentMain && currentMain.score - lastCommentaryScoreRef.current >= 600) {
      lastCommentaryScoreRef.current = currentMain.score;
      getCommentary({ score: currentMain.score, crashes: currentMain.crashCount, maxSpeed: currentMain.speed }).then(setCommentary);
    }
  };

  const drawDetailedObstacle = (ctx: CanvasRenderingContext2D, type: ObstacleType, dx: number, dy: number) => {
    ctx.save(); ctx.translate(dx, dy);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, 5, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    switch (type) {
        case ObstacleType.MUD: ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.ellipse(0, 4, 18, 9, 0.1, 0, Math.PI * 2); ctx.fill(); break;
        case ObstacleType.WATER: ctx.fillStyle = 'rgba(3, 169, 244, 0.6)'; ctx.beginPath(); ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2); ctx.fill(); break;
        case ObstacleType.OIL_SLICK: ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, 4, 18, 9, -0.1, 0, Math.PI * 2); ctx.fill(); break;
        case ObstacleType.GRAVEL: ctx.fillStyle = '#757575'; ctx.beginPath(); ctx.ellipse(0, 4, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); break;
        case ObstacleType.BUMP: ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(0, -8); ctx.lineTo(14, 8); ctx.fill(); break;
        case ObstacleType.RAMP:
        case ObstacleType.BIG_RAMP: const isBig = type === ObstacleType.BIG_RAMP; const h = isBig ? 30 : 18; const w = isBig ? 36 : 26; ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.moveTo(w/2, 8); ctx.lineTo(w/2, -h); ctx.lineTo(-w/2, 8); ctx.fill(); break;
        case ObstacleType.HURDLE: ctx.fillStyle = '#212121'; ctx.fillRect(-14, 0, 4, 10); ctx.fillRect(10, 0, 4, 10); ctx.fillStyle = gameFrameRef.current % 20 < 10 ? '#ffeb3b' : '#f44336'; ctx.fillRect(-14, 0, 28, 5); break;
    }
    ctx.restore();
  };

  const drawViewport = (ctx: CanvasRenderingContext2D, player: Player, viewportY: number, viewportHeight: number) => {
    if (!player) return;
    const isSplit = gameMode !== GameMode.SINGLE;
    
    const laneCenter = (TRACK_TOP + TRACK_BOTTOM) / 2;
    const viewCenter = viewportHeight / 2;
    const verticalShift = viewCenter - laneCenter;
    
    const colors = THEME_COLORS[theme];
    const camX = player.x - 60;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, viewportY, VIRTUAL_WIDTH, viewportHeight);
    ctx.clip();

    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(sx, viewportY + sy);
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, viewportHeight);
    ctx.fillStyle = colors.mountain;
    const mountainX = -(camX * 0.12) % VIRTUAL_WIDTH;
    for(let i = -1; i < 2; i++) {
        const mx = i * VIRTUAL_WIDTH + mountainX;
        ctx.beginPath(); ctx.moveTo(mx, 60); ctx.lineTo(mx + 60, 25); ctx.lineTo(mx + 120, 60); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(sx, viewportY + sy + verticalShift);
    
    ctx.fillStyle = colors.grass;
    ctx.fillRect(0, TRACK_TOP - 100, VIRTUAL_WIDTH, TRACK_BOTTOM - TRACK_TOP + 200);
    
    // Draw Track Surface
    for (let x = camX; x < camX + VIRTUAL_WIDTH; x += 1) {
      const layout = getTrackLayoutAt(x);
      const drawX = x - camX;
      ctx.fillStyle = COLORS.TRACK;
      const yStart = TRACK_TOP + layout.yOffset + (layout.minLane * LANE_HEIGHT);
      const yHeight = (layout.maxLane - layout.minLane + 1) * LANE_HEIGHT;
      ctx.fillRect(drawX, yStart, 1, yHeight);
    }

    // Draw Lane Markers (Track Lines)
    ctx.fillStyle = COLORS.LANE_MARKER;
    for (let l = 1; l < 4; l++) {
        const lineY = TRACK_TOP + l * LANE_HEIGHT;
        // Draw dashed lines by iterating over segments
        for (let lx = camX - (camX % 24); lx < camX + VIRTUAL_WIDTH; lx += 24) {
            const layoutAtLine = getTrackLayoutAt(lx);
            // Check if lane separator is within the current visible lanes
            if (l > layoutAtLine.minLane && l <= layoutAtLine.maxLane) {
                ctx.fillRect(lx - camX, lineY + layoutAtLine.yOffset - 1, 12, 1);
            }
        }
    }

    const worldFinishX = STAGE_LENGTH * 10;
    const finishX = worldFinishX - camX;
    if (finishX > -120 && finishX < VIRTUAL_WIDTH + 120) {
        const layoutAtFinish = getTrackLayoutAt(worldFinishX);
        const yBase = TRACK_TOP + layoutAtFinish.yOffset;
        const startLaneY = yBase + (layoutAtFinish.minLane * LANE_HEIGHT);
        const totalLanesHeight = (layoutAtFinish.maxLane - layoutAtFinish.minLane + 1) * LANE_HEIGHT;
        ctx.fillStyle = '#fff';
        const checkerSize = 10;
        for (let i = 0; i < 40; i += checkerSize) {
          for (let j = 0; j < totalLanesHeight; j += checkerSize) {
            ctx.fillStyle = ((i / checkerSize) + (j / checkerSize)) % 2 === 0 ? '#fff' : '#000';
            ctx.fillRect(finishX + i, startLaneY + j, checkerSize, checkerSize);
          }
        }
    }

    obstaclesRef.current.forEach(obs => {
      if (obs.x > camX - 60 && obs.x < camX + VIRTUAL_WIDTH + 60) {
        const obsLayout = getTrackLayoutAt(obs.x);
        drawDetailedObstacle(ctx, obs.type, obs.x - camX, TRACK_TOP + obsLayout.yOffset + (obs.lane * LANE_HEIGHT) + 10);
      }
    });

    [...npcsRef.current, ...playersRef.current].sort((a,b) => a.lane - b.lane).forEach(entity => {
      if (entity.x > camX - 70 && entity.x < camX + VIRTUAL_WIDTH + 70) {
        ctx.save();
        ctx.translate(entity.x - camX, entity.y - entity.z);
        const shadowS = Math.max(0, 9 - (entity.z/8));
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, entity.z + 7, shadowS, shadowS/2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.rotate((entity as any).rotation || 0);
        
        let bikeColor = (entity as Player).upgrades?.color || (entity as any).color || COLORS.BIKE_BODY;
        let trimColor = '#fff';
        let engineColor = '#888';

        if ((entity as Player).upgrades) {
          const u = (entity as Player).upgrades!;
          if (u.engine >= 2) {
             trimColor = COLORS.GOLD_TRIM;
             engineColor = '#ddd';
          } else if (u.engine >= 1) {
             trimColor = COLORS.PLATINUM_TRIM;
             engineColor = '#aaa';
          }
        }

        if (entity.isCrashed) {
            ctx.fillStyle = '#222'; ctx.fillRect(-10, 3, 18, 4); 
            ctx.fillStyle = bikeColor; ctx.fillRect(-8, 1, 4, 3);
        } else {
            if (entity.speed > MAX_SPEED + 0.5) { const flicker = Math.random() > 0.4; ctx.fillStyle = flicker ? '#ffeb3b' : '#f44336'; ctx.fillRect(-12, -4, -12, 4); }
            ctx.fillStyle = '#111'; ctx.fillRect(-10, 0, 8, 8); ctx.fillRect(4, 0, 8, 8);
            ctx.fillStyle = engineColor; ctx.fillRect(-2, -5, 5, 4);
            ctx.fillStyle = bikeColor; ctx.fillRect(-3, -8, 10, 4); 
            const leanX = Math.min(3, entity.speed / 2);
            ctx.fillStyle = bikeColor; ctx.fillRect(leanX, -14, 6, 8); 
            ctx.fillStyle = trimColor; ctx.fillRect(leanX, -18, 6, 6); 
            ctx.fillStyle = '#000'; ctx.fillRect(leanX + 2, -15, 4, 1);
        }
        ctx.restore();
      }
    });

    particlesRef.current.forEach(p => {
      if (p.x > camX && p.x < camX + VIRTUAL_WIDTH) {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.maxLife; ctx.fillRect(p.x - camX, p.y - p.z, p.size, p.size); ctx.globalAlpha = 1.0;
      }
    });

    feedbacks.forEach(f => {
      if (f.x > camX && f.x < camX + VIRTUAL_WIDTH) {
        ctx.textAlign = 'center'; ctx.fillStyle = f.color || '#ffeb3b'; ctx.font = '5px "Press Start 2P"'; ctx.fillText(f.text, f.x - camX, f.y);
      }
    });
    ctx.restore();

    ctx.save();
    ctx.translate(0, viewportY);
    const hudScale = isSplit ? 0.75 : 1.0;
    ctx.scale(hudScale, hudScale);
    
    // HUD safe positioning (Increased margins from edges to 24, 16)
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; // Higher transparency as requested
    ctx.fillRect(24, 16, 92, 36); 
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; // Softer retro border
    ctx.lineWidth = 1; 
    ctx.strokeRect(24, 16, 92, 36);
    
    ctx.fillStyle = '#ffeb3b'; 
    ctx.font = '5px "Press Start 2P"'; 
    ctx.fillText(`P${player.id + 1}`, 30, 26);
    ctx.fillStyle = '#fff'; 
    ctx.fillText(`${player.score}M`, 30, 36);
    if (player.comboMultiplier > 1) { 
        ctx.fillStyle = '#4caf50'; 
        ctx.fillText(`x${player.comboMultiplier}`, 30, 46); 
    }
    
    // Heat Bar safe positioning (Pinned to right with symmetrical margin)
    const barX = (VIRTUAL_WIDTH / hudScale) - 92;
    ctx.fillStyle = '#080808'; 
    ctx.fillRect(barX, 16, 68, 14);
    ctx.fillStyle = player.heat > 85 ? '#f44336' : (player.heat > 60 ? '#ffeb3b' : '#4caf50'); 
    ctx.fillRect(barX + 2, 18, (player.heat/100)*64, 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; 
    ctx.strokeRect(barX, 16, 68, 14);
    
    ctx.restore();

    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.imageSmoothingEnabled = false; 
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    
    if (playersRef.current.length === 0) return;

    if (gameMode === GameMode.TWO_PLAYER || gameMode === GameMode.ONLINE) {
      if (playersRef.current[0]) drawViewport(ctx, playersRef.current[0], 0, VIRTUAL_HEIGHT/2);
      if (playersRef.current[1]) drawViewport(ctx, playersRef.current[1], VIRTUAL_HEIGHT/2, VIRTUAL_HEIGHT/2);
      ctx.fillStyle = '#000'; ctx.fillRect(0, VIRTUAL_HEIGHT/2 - 1, VIRTUAL_WIDTH, 2);
    } else {
      if (playersRef.current[0]) drawViewport(ctx, playersRef.current[0], 0, VIRTUAL_HEIGHT);
    }
    
    ctx.fillStyle = '#000'; 
    ctx.fillRect(0, VIRTUAL_HEIGHT - 16, VIRTUAL_WIDTH, 16);
    ctx.fillStyle = '#ffeb3b'; 
    ctx.font = '5px "Press Start 2P"'; 
    ctx.textAlign = 'center'; 
    ctx.fillText(commentary, VIRTUAL_WIDTH/2, VIRTUAL_HEIGHT - 6);
  };

  const loop = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    update(); draw(ctx); requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, upgrades, gameMode, theme]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <canvas ref={canvasRef} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} className="w-full h-full" />
    </div>
  );
});

export default GameCanvas;
