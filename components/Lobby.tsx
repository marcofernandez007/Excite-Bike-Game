
import React, { useState, useEffect } from 'react';
import { Peer } from 'https://esm.sh/peerjs@1.5.4';

interface LobbyProps {
  onConnected: (peer: any, conn: any, isHost: boolean) => void;
  onCancel: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ onConnected, onCancel }) => {
  const [peer, setPeer] = useState<any>(null);
  const [myId, setMyId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'WAITING'>('IDLE');

  useEffect(() => {
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      setMyId(id.slice(0, 6).toUpperCase());
      setPeer(newPeer);
    });

    newPeer.on('connection', (conn) => {
      setStatus('CONNECTING');
      conn.on('open', () => {
        onConnected(newPeer, conn, true);
      });
    });

    return () => {
      newPeer.destroy();
    };
  }, []);

  const handleJoin = () => {
    if (!targetId || !peer) return;
    setStatus('CONNECTING');
    // Try to find the full ID if user entered a short one
    // In a real app we'd use a broker, here we assume IDs are generated sequentially or known
    // For PeerJS default server, we just use the ID as provided
    const conn = peer.connect(targetId.toLowerCase());
    conn.on('open', () => {
      onConnected(peer, conn, false);
    });
    conn.on('error', (err: any) => {
      alert("Could not connect. Check the code.");
      setStatus('IDLE');
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2196f3] z-10 p-6">
      <div className="bg-zinc-900 p-8 pixel-border max-w-md w-full">
        <h2 className="text-white text-2xl mb-6 text-center">ONLINE LOBBY</h2>
        
        <div className="mb-8 p-4 bg-zinc-800 border-2 border-dashed border-zinc-600 rounded">
          <p className="text-zinc-400 text-[10px] mb-2">YOUR ROOM CODE:</p>
          <p className="text-white text-3xl tracking-widest font-bold text-center">
            {myId || 'LOADING...'}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-zinc-400 text-[10px]">JOIN ANOTHER ROOM:</p>
            <input 
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="bg-zinc-800 text-white p-3 border-2 border-zinc-700 outline-none focus:border-blue-500 text-center uppercase"
            />
            <button 
              onClick={handleJoin}
              disabled={status === 'CONNECTING'}
              className="bg-[#4caf50] hover:bg-[#388e3c] text-white py-3 disabled:opacity-50"
            >
              {status === 'CONNECTING' ? 'CONNECTING...' : 'JOIN RACE'}
            </button>
          </div>

          <div className="h-px bg-zinc-700 my-2" />

          <button 
            onClick={onCancel}
            className="text-zinc-400 text-[10px] hover:text-white underline"
          >
            BACK TO MENU
          </button>
        </div>
      </div>
      
      {status === 'WAITING' && (
        <div className="mt-4 text-white animate-pulse">
          WAITING FOR CHALLENGER...
        </div>
      )}
    </div>
  );
};

export default Lobby;
