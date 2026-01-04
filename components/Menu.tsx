
import React from 'react';
import { GameMode } from '../types';

interface MenuProps {
  onStart: (mode: GameMode) => void;
  onGarage?: () => void;
}

const Menu: React.FC<MenuProps> = ({ onStart, onGarage }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2196f3] z-10">
      <div className="bg-zinc-900 p-8 pixel-border transform -rotate-1">
        <h1 className="text-white text-4xl md:text-5xl mb-2 text-center drop-shadow-[4px_4px_0px_#f44336]">
          PIXEL
        </h1>
        <h1 className="text-white text-5xl md:text-6xl mb-8 text-center drop-shadow-[4px_4px_0px_#f44336]">
          EXCITEBIKE
        </h1>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => onStart(GameMode.SINGLE)}
            className="bg-[#f44336] hover:bg-[#d32f2f] text-white py-3 px-8 text-lg transition-all hover:scale-105"
          >
            SELECT GAME A (1P)
          </button>
          <button 
            onClick={() => onStart(GameMode.TWO_PLAYER)}
            className="bg-[#4caf50] hover:bg-[#388e3c] text-white py-3 px-8 text-lg transition-all hover:scale-105"
          >
            SELECT GAME B (2P)
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={() => onStart(GameMode.ONLINE)}
              className="flex-1 bg-[#ff9800] hover:bg-[#f57c00] text-white py-3 px-4 text-xs transition-all border-b-4 border-orange-800"
            >
              ONLINE MULTI
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('nav-garage'))}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 text-xs transition-all border-b-4 border-blue-800"
            >
              BIKE SHOP
            </button>
          </div>
          
          <div className="text-white/60 text-[8px] text-center mt-4 uppercase">
            P1: ARROWS + Z/X | P2: WASD + F/G
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-blue-950 font-bold text-center">
        <p>© 2026 RETRO PIXEL STUDIOS</p>
      </div>
    </div>
  );
};

export default Menu;
