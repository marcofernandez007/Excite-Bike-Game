
import React from 'react';
import { BikeUpgrades } from '../types';
import { UPGRADES, COLORS, RETRO_PALETTE } from '../constants';
import { audioService } from '../services/audioService';

interface GarageProps {
  points: number;
  upgrades: BikeUpgrades;
  onPurchase: (type: keyof BikeUpgrades, tier: number, cost: number) => void;
  onExit: () => void;
  onColorSelect: (color: string) => void;
}

const EngineIcon = () => (
  <svg width="48" height="48" viewBox="0 0 16 16" className="mx-auto mb-2" style={{ imageRendering: 'pixelated' }}>
    <rect x="2" y="5" width="12" height="7" fill="#616161" />
    <rect x="4" y="3" width="8" height="2" fill="#9e9e9e" />
    <rect x="6" y="7" width="4" height="3" fill="#ff9800" />
    <rect x="14" y="7" width="2" height="3" fill="#424242" />
    <rect x="1" y="7" width="1" height="3" fill="#424242" />
  </svg>
);

const CoolingIcon = () => (
  <svg width="48" height="48" viewBox="0 0 16 16" className="mx-auto mb-2" style={{ imageRendering: 'pixelated' }}>
    <rect x="3" y="3" width="10" height="10" fill="#0288d1" />
    <rect x="4" y="4" width="8" height="1" fill="#81d4fa" />
    <rect x="4" y="6" width="8" height="1" fill="#81d4fa" />
    <rect x="4" y="8" width="8" height="1" fill="#81d4fa" />
    <rect x="4" y="10" width="8" height="1" fill="#81d4fa" />
    <rect x="2" y="5" width="1" height="6" fill="#01579b" />
    <rect x="13" y="5" width="1" height="6" fill="#01579b" />
  </svg>
);

const TurboIcon = () => (
  <svg width="48" height="48" viewBox="0 0 16 16" className="mx-auto mb-2" style={{ imageRendering: 'pixelated' }}>
    <rect x="6" y="2" width="4" height="11" fill="#d32f2f" />
    <rect x="7" y="1" width="2" height="1" fill="#9e9e9e" />
    <rect x="6" y="13" width="4" height="2" fill="#212121" />
    <rect x="7" y="4" width="2" height="4" fill="white" fillOpacity="0.4" />
    <path d="M4 10L2 12M12 10L14 12" stroke="#ffeb3b" strokeWidth="1" />
  </svg>
);

const BikePreview = ({ upgrades }: { upgrades: BikeUpgrades }) => {
  let color = upgrades.color || COLORS.BIKE_BODY;
  if (upgrades.engine >= 2) color = COLORS.GOLD_TRIM;
  else if (upgrades.engine >= 1) color = COLORS.PLATINUM_TRIM;

  return (
    <div className="flex flex-col items-center mb-6 p-4 bg-black/40 pixel-border border-zinc-700">
      <div className="text-[8px] text-zinc-500 mb-4 uppercase tracking-[0.2em]">Current Machine</div>
      <svg width="120" height="60" viewBox="0 0 40 20" style={{ imageRendering: 'pixelated' }}>
        {/* Wheels */}
        <rect x="6" y="12" width="8" height="8" rx="4" fill="#111" />
        <rect x="26" y="12" width="8" height="8" rx="4" fill="#111" />
        {/* Frame */}
        <rect x="10" y="8" width="20" height="6" fill="#333" />
        {/* Body */}
        <rect x="14" y="4" width="14" height="5" fill={color} />
        <rect x="16" y="2" width="6" height="3" fill={color} />
        {/* Rider Helmet */}
        <rect x="18" y="0" width="5" height="5" fill="white" />
        {/* Exhaust */}
        <rect x="6" y="10" width="6" height="2" fill="#555" />
        {upgrades.turbo > 0 && <rect x="2" y="10" width="4" height="2" fill="#f44336" />}
      </svg>
    </div>
  );
};

const Garage: React.FC<GarageProps> = ({ points, upgrades, onPurchase, onExit, onColorSelect }) => {
  const categories: (keyof BikeUpgrades)[] = ['engine', 'cooling', 'turbo'];
  
  const getIcon = (cat: string) => {
    if (cat === 'engine') return <EngineIcon />;
    if (cat === 'cooling') return <CoolingIcon />;
    return <TurboIcon />;
  };

  const renderTier = (cat: keyof BikeUpgrades, tierIndex: number) => {
    const tier = (UPGRADES as any)[cat][tierIndex];
    const isOwned = upgrades[cat] >= tierIndex;
    const isNext = upgrades[cat] + 1 === tierIndex;
    const canAfford = points >= tier.cost;

    return (
      <div 
        key={`${cat}-${tierIndex}`}
        className={`p-3 pixel-border flex flex-col gap-2 transition-all ${isOwned ? 'bg-green-900/40 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-zinc-800 border-zinc-700'}`}
      >
        <div className="flex justify-between items-start gap-1">
          <span className={`text-[8px] leading-tight ${isOwned ? 'text-green-400' : 'text-zinc-300'}`}>
            {tier.name}
          </span>
          {isOwned && <span className="text-[5px] bg-green-500 text-black px-1 py-0.5 font-bold">OWNED</span>}
        </div>
        
        {!isOwned && (
          <>
            <div className="text-yellow-400 text-[9px] font-bold">{tier.cost} <span className="text-[7px]">PTS</span></div>
            <button
              onClick={() => {
                if (isNext && canAfford) {
                  audioService.playFlipLanding(2);
                  onPurchase(cat, tierIndex, tier.cost);
                } else {
                  audioService.playBeep(200, 0.1);
                }
              }}
              disabled={!isNext || !canAfford}
              className={`py-2 text-[8px] text-white transition-all shadow-[0_4px_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 ${
                isNext && canAfford 
                ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer' 
                : 'bg-zinc-700 opacity-50 cursor-not-allowed shadow-none translate-y-1'
              }`}
            >
              {isNext ? (canAfford ? 'PURCHASE' : 'INSUFFICIENT') : 'LOCKED'}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto bg-[#0a0a1a] z-30 p-4 font-['Press_Start_2P']">
      <div className="max-w-3xl w-full bg-zinc-900 pixel-border border-zinc-600 p-4 md:p-8 flex flex-col gap-6 my-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        
        {/* Header section with text alignment fix */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 border-zinc-800 pb-6 pt-2">
          <div className="text-center md:text-left">
            <h2 className="text-white text-xl md:text-2xl tracking-tighter drop-shadow-[2px_2px_0px_#2196f3]">BIKE GARAGE</h2>
            <div className="text-zinc-500 text-[7px] mt-1 uppercase tracking-widest">Performance Tuning Center</div>
          </div>
          
          <div className="bg-black/60 p-3 pixel-border border-zinc-700 flex flex-col items-center min-w-[140px]">
            <div className="text-zinc-500 text-[6px] mb-1 uppercase tracking-widest">Available Points</div>
            <div className="text-yellow-400 text-lg md:text-xl">{points.toLocaleString()}</div>
          </div>
        </div>

        <BikePreview upgrades={upgrades} />

        {/* Color Palette Section */}
        <div className="bg-black/30 p-4 pixel-border border-zinc-700">
           <div className="text-[7px] text-zinc-500 mb-3 text-center uppercase tracking-[0.2em]">Paint Shop</div>
           <div className="flex flex-wrap justify-center gap-3">
              {RETRO_PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    audioService.playBeep(440, 0.05);
                    onColorSelect(color);
                  }}
                  className={`w-8 h-8 pixel-border transition-transform active:scale-90 ${upgrades.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div key={cat} className="flex flex-col gap-3">
              <div className="flex flex-col items-center">
                {getIcon(cat)}
                <h3 className="text-white text-[8px] uppercase tracking-widest mb-2 border-b-2 border-zinc-800 w-full text-center pb-2">{cat}</h3>
              </div>
              <div className="flex flex-col gap-3">
                {[1, 2].map(tier => renderTier(cat, tier))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-6">
          <div className="p-4 bg-blue-900/10 border-2 border-blue-500/40 text-[7px] leading-relaxed text-blue-300 text-center italic">
            "ELITE COMPONENTS PROVIDE THE ULTIMATE EDGE IN CHAMPIONSHIP RACES."
          </div>
          
          <button 
            onClick={onExit}
            className="bg-white text-black py-5 hover:bg-yellow-400 transition-colors text-[12px] shadow-[0_6px_0_#999] active:shadow-none active:translate-y-1.5"
          >
            RETURN TO CIRCUIT
          </button>
        </div>
      </div>
      
      {/* Decorative background text */}
      <div className="fixed bottom-4 right-4 text-[6px] text-zinc-800 pointer-events-none select-none">
        VER 1.26 - GARAGE_MODULE_ACTIVE
      </div>
    </div>
  );
};

export default Garage;
