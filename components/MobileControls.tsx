
import React from 'react';

interface MobileControlsProps {
  onPress: (key: string) => void;
  onRelease: (key: string) => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({ onPress, onRelease }) => {
  const handleTouch = (e: React.TouchEvent | React.MouseEvent, key: string, type: 'start' | 'end') => {
    e.preventDefault();
    if (type === 'start') {
      onPress(key);
    } else {
      onRelease(key);
    }
  };

  const Button = ({ label, code, className, subLabel, style = {} }: { label: string, code: string, className: string, subLabel?: string, style?: React.CSSProperties }) => (
    <div className={`flex flex-col items-center gap-1 ${className}`} style={style}>
      <div
        onTouchStart={(e) => handleTouch(e, code, 'start')}
        onTouchEnd={(e) => handleTouch(e, code, 'end')}
        onMouseDown={(e) => handleTouch(e, code, 'start')}
        onMouseUp={(e) => handleTouch(e, code, 'end')}
        onMouseLeave={(e) => handleTouch(e, code, 'end')}
        className={`select-none cursor-pointer flex items-center justify-center active:scale-95 transition-transform shadow-[0_4px_0_rgb(0,0,0,0.5)] active:shadow-none active:translate-y-1 w-full h-full rounded-md`}
      >
        <span className="pointer-events-none font-bold">{label}</span>
      </div>
      {subLabel && <span className="absolute -bottom-5 text-[8px] text-zinc-500 uppercase tracking-widest whitespace-nowrap">{subLabel}</span>}
    </div>
  );

  return (
    <div className="w-full flex items-center justify-between p-8 bg-zinc-900 border-x-8 border-b-8 border-zinc-800 rounded-b-2xl shadow-2xl">
      {/* D-PAD Area */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Cross background */}
        <div className="absolute w-12 h-40 bg-zinc-800 rounded-lg border-2 border-zinc-700 shadow-inner" />
        <div className="absolute h-12 w-40 bg-zinc-800 rounded-lg border-2 border-zinc-700 shadow-inner" />
        
        {/* Buttons - Absolutely centered on the cross arms */}
        <Button 
          label="▲" 
          code="ArrowUp" 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 text-zinc-300 text-xl bg-zinc-800 border border-zinc-700" 
        />
        <Button 
          label="▼" 
          code="ArrowDown" 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 text-zinc-300 text-xl bg-zinc-800 border border-zinc-700" 
        />
        <Button 
          label="◀" 
          code="ArrowLeft" 
          className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 text-zinc-300 text-xl bg-zinc-800 border border-zinc-700" 
        />
        <Button 
          label="▶" 
          code="ArrowRight" 
          className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 text-zinc-300 text-xl bg-zinc-800 border border-zinc-700" 
        />
        
        {/* Center pivot decoration */}
        <div className="absolute w-10 h-10 rounded-full bg-zinc-700 border border-zinc-600 pointer-events-none flex items-center justify-center">
           <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
        </div>
      </div>

      {/* Decorative center section like a real controller */}
      <div className="hidden md:flex flex-col gap-4 opacity-20">
         <div className="w-12 h-3 bg-zinc-700 rounded-full" />
         <div className="w-12 h-3 bg-zinc-700 rounded-full" />
      </div>

      {/* ACTION Area */}
      <div className="flex gap-12 items-end">
        <div className="relative">
          <Button 
            label="B" 
            code="KeyZ" 
            subLabel="GAS"
            className="w-20 h-20 rounded-full bg-[#f44336] border-4 border-zinc-800 text-white text-3xl flex items-center justify-center hover:bg-[#d32f2f]" 
          />
        </div>
        <div className="relative -translate-y-10">
          <Button 
            label="A" 
            code="KeyX" 
            subLabel="TURBO"
            className="w-24 h-24 rounded-full bg-[#f44336] border-4 border-zinc-800 text-white text-4xl flex items-center justify-center hover:bg-[#d32f2f]" 
          />
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
