
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, GameMode, StageTheme, BikeUpgrades } from './types';
import GameCanvas, { GameCanvasHandle } from './components/GameCanvas';
import Menu from './components/Menu';
import Lobby from './components/Lobby';
import Garage from './components/Garage';
import MobileControls from './components/MobileControls';
import { audioService } from './services/audioService';
import { STAGE_LENGTH, COLORS } from './constants';

const STAGE_SEQUENCE = [StageTheme.DAY, StageTheme.DUSK, StageTheme.NIGHT, StageTheme.STORM];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.SINGLE);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [results, setResults] = useState<{score: number, crashes: number}[]>([]);
  const [multiplayerData, setMultiplayerData] = useState<{peer: any, conn: any, isHost: boolean} | null>(null);
  
  const [totalPoints, setTotalPoints] = useState(0);
  const [upgrades, setUpgrades] = useState<BikeUpgrades>({ 
    engine: 0, 
    cooling: 0, 
    turbo: 0, 
    color: COLORS.BIKE_BODY 
  });

  const gameCanvasRef = useRef<GameCanvasHandle>(null);

  useEffect(() => {
    const handleNavGarage = () => setGameState(GameState.GARAGE);
    window.addEventListener('nav-garage', handleNavGarage);
    return () => window.removeEventListener('nav-garage', handleNavGarage);
  }, []);

  const startGame = useCallback((mode: GameMode = GameMode.SINGLE, resetStageProgression = false) => {
    audioService.init();
    audioService.playBeep(880, 0.2);
    setGameMode(mode);
    
    if (resetStageProgression) {
      setCurrentStageIndex(0);
      setResults([]);
    }
    
    if (mode === GameMode.ONLINE) {
      setGameState(GameState.LOBBY);
    } else {
      setGameState(GameState.PLAYING);
    }
  }, []);

  const onOnlineConnected = (peer: any, conn: any, isHost: boolean) => {
    setMultiplayerData({ peer, conn, isHost });
    setGameMode(GameMode.ONLINE);
    setGameState(GameState.PLAYING);
    setResults([]);
    audioService.playBeep(1200, 0.1);
  };

  const onGameOver = useCallback((finalResults: {score: number, crashes: number}[]) => {
    setResults(finalResults);
    setGameState(GameState.GAMEOVER);
  }, []);

  const onLevelComplete = useCallback((finalResults: {score: number, crashes: number}[]) => {
    setResults(finalResults);
    const pointsGained = Math.floor(finalResults[0].score * 0.15);
    setTotalPoints(prev => prev + pointsGained);
    setGameState(GameState.LEVEL_COMPLETE);
    audioService.playBeep(1000, 0.5);
  }, []);

  const handlePurchase = (type: keyof BikeUpgrades, tier: number, cost: number) => {
    setTotalPoints(p => p - cost);
    setUpgrades(prev => ({ ...prev, [type]: tier }));
  };

  const handleColorChange = (color: string) => {
    setUpgrades(prev => ({ ...prev, color }));
  };

  const nextLevel = () => {
    setCurrentStageIndex((prev) => (prev + 1) % STAGE_SEQUENCE.length);
    setGameState(GameState.PLAYING);
  };

  const handleMobilePress = (code: string) => {
    gameCanvasRef.current?.handleExternalKeyDown(code);
  };

  const handleMobileRelease = (code: string) => {
    gameCanvasRef.current?.handleExternalKeyUp(code);
  };

  const quitToMenu = () => {
    audioService.stopEngine();
    audioService.playBeep(440, 0.1);
    setGameState(GameState.MENU);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-zinc-950 p-4">
      <div className="relative w-full max-w-4xl aspect-[4/3.5] bg-black shadow-2xl overflow-hidden rounded-t-lg border-8 border-zinc-800">
        {gameState === GameState.MENU && (
          <Menu onStart={(mode) => startGame(mode, true)} />
        )}

        {gameState === GameState.LOBBY && (
          <Lobby 
            onConnected={onOnlineConnected} 
            onCancel={() => setGameState(GameState.MENU)} 
          />
        )}

        {gameState === GameState.GARAGE && (
          <Garage 
            points={totalPoints}
            upgrades={upgrades}
            onPurchase={handlePurchase}
            onExit={() => setGameState(GameState.MENU)}
            onColorSelect={handleColorChange}
          />
        )}
        
        {(gameState === GameState.PLAYING || gameState === GameState.GAMEOVER || gameState === GameState.LEVEL_COMPLETE) && (
          <>
            <GameCanvas 
              key={`${currentStageIndex}-${gameMode}`}
              ref={gameCanvasRef}
              gameState={gameState} 
              gameMode={gameMode}
              theme={STAGE_SEQUENCE[currentStageIndex]}
              stageIndex={currentStageIndex}
              onGameOver={onGameOver} 
              onLevelComplete={onLevelComplete}
              multiplayer={multiplayerData}
              upgrades={upgrades}
            />
            {gameState === GameState.PLAYING && (
              <button 
                onClick={quitToMenu}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-red-600/80 hover:bg-red-500 text-white text-[8px] px-4 py-1.5 pixel-border border-white/50 transition-all active:scale-95 group font-['Press_Start_2P']"
              >
                <span className="group-hover:hidden">MENU</span>
                <span className="hidden group-hover:inline">QUIT?</span>
              </button>
            )}
          </>
        )}

        {gameState === GameState.LEVEL_COMPLETE && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center font-['Press_Start_2P']">
            <h2 className="text-white text-4xl mb-2 tracking-tighter text-yellow-400">STAGE COMPLETE!</h2>
            <div className="my-6 p-4 bg-zinc-900 pixel-border border-yellow-400">
               <div className="text-zinc-500 text-[8px] mb-2 uppercase">Earned Points</div>
               <div className="text-yellow-400 text-2xl">+{Math.floor(results[0]?.score * 0.15)}</div>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={nextLevel}
                className="bg-[#4caf50] text-white px-6 py-4 text-xs hover:bg-[#388e3c] transition-all hover:scale-105"
              >
                NEXT STAGE
              </button>
              <button 
                onClick={() => setGameState(GameState.GARAGE)}
                className="bg-blue-600 text-white px-6 py-4 text-xs hover:bg-blue-500 transition-all hover:scale-105"
              >
                BIKE SHOP
              </button>
            </div>
          </div>
        )}

        {gameState === GameState.GAMEOVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center font-['Press_Start_2P']">
            <h2 className="text-white text-4xl mb-6 tracking-tighter">RACE OVER</h2>
            <div className="flex gap-8 mb-8">
              {results.map((res, i) => (
                <div key={i} className="bg-zinc-900 p-4 pixel-border">
                  <div className="text-white mb-2 text-[10px]">PLAYER {i + 1}</div>
                  <div className="text-yellow-400 text-sm">DIST: {res.score}m</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => startGame(gameMode)}
                className="bg-white text-black px-6 py-4 text-xs hover:bg-yellow-400 transition-colors"
              >
                RETRY
              </button>
              <button 
                onClick={() => setGameState(GameState.MENU)}
                className="bg-zinc-700 text-white px-6 py-4 text-xs hover:bg-zinc-600"
              >
                MENU
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Controls positioned under the game screen unit */}
      {gameState === GameState.PLAYING && (
        <div className="w-full max-w-4xl">
          <MobileControls 
            onPress={handleMobilePress} 
            onRelease={handleMobileRelease} 
          />
        </div>
      )}
      
      <div className="mt-8 flex justify-center w-full max-w-4xl">
        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-700 w-full flex justify-between items-center font-['Press_Start_2P']">
           <div className="flex gap-10">
              <div className="text-center">
                 <div className="text-zinc-500 text-[8px] mb-1">ENGINE</div>
                 <div className="text-white text-[10px]">{upgrades.engine > 0 ? 'TIER ' + upgrades.engine : 'STOCK'}</div>
              </div>
              <div className="text-center">
                 <div className="text-zinc-500 text-[8px] mb-1">COOLING</div>
                 <div className="text-white text-[10px]">{upgrades.cooling > 0 ? 'TIER ' + upgrades.cooling : 'STOCK'}</div>
              </div>
              <div className="text-center">
                 <div className="text-zinc-500 text-[8px] mb-1">TURBO</div>
                 <div className="text-white text-[10px]">{upgrades.turbo > 0 ? 'TIER ' + upgrades.turbo : 'STOCK'}</div>
              </div>
           </div>
           <div className="text-right">
              <div className="text-zinc-500 text-[8px] mb-1">TOTAL EXCITE POINTS</div>
              <div className="text-yellow-400 text-lg">{totalPoints}</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
