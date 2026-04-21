import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Terminal, Gamepad2, RefreshCw } from 'lucide-react';

const CANVAS_SIZE = 400;
const GRID_SIZE = 20;
const SNAKE_SPEED = 120; // ms per frame

const TRACKS = [
  { id: 1, title: "Neon Grid Protocol (AI Demo 1)", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "Synthetic Sunset (AI Demo 2)", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "Cyber Chase (AI Demo 3)", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
];

function Equalizer({ isPlaying }: { isPlaying: boolean }) {
  const [heights, setHeights] = useState([20, 20, 20, 20, 20]);

  useEffect(() => {
    if (!isPlaying) {
      setHeights([20, 20, 20, 20, 20]);
      return;
    }
    const interval = setInterval(() => {
      setHeights(Array.from({ length: 5 }, () => Math.floor(Math.random() * 80) + 20));
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex h-8 items-end gap-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 bg-fuchsia-500 transition-all duration-150 rounded-t-sm"
          style={{
            height: `${h}%`,
            boxShadow: '0 0 10px rgba(217,70,239,0.8)'
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  // Game State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<{ x: number; y: number }[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<{ x: number; y: number }>({ x: 15, y: 15 });
  const dirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  const nextDirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('synthSnakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  
  // Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStartedMusicOnce, setHasStartedMusicOnce] = useState(false);

  // Sync high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('synthSnakeHighScore', score.toString());
    }
  }, [score, highScore]);

  // Audio Controls
  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingMusic) {
        audioRef.current.play().catch(e => console.error("Audio playback error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingMusic, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayMusic = () => setIsPlayingMusic(!isPlayingMusic);
  const nextTrack = () => setCurrentTrackIndex((i) => (i + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    if (isMuted) setIsMuted(false);
  };

  // Game Logic
  const generateFood = useCallback((currentSnake: { x: number; y: number }[]) => {
    let newFood = { x: 0, y: 0 };
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
      };
      isOccupied = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
    }
    return newFood;
  }, []);

  const moveSnake = useCallback(() => {
    if (isGameOver) return;

    const head = snakeRef.current[0];
    const newHead = {
      x: head.x + nextDirRef.current.x,
      y: head.y + nextDirRef.current.y,
    };

    dirRef.current = nextDirRef.current; // Commit direction

    // Walls Collision
    if (
      newHead.x < 0 ||
      newHead.x >= CANVAS_SIZE / GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= CANVAS_SIZE / GRID_SIZE
    ) {
      setIsGameOver(true);
      return;
    }

    // Self Collision
    if (snakeRef.current.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
      setIsGameOver(true);
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    // Food Collision
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      setScore((s) => s + 10);
      foodRef.current = generateFood(newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  }, [isGameOver, generateFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines for aesthetic
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899'; // pink-500
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(foodRef.current.x * GRID_SIZE, foodRef.current.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

    // Snake
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22d3ee'; // cyan-400
    snakeRef.current.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#67e8f9'; // head brighter
      } else {
        ctx.fillStyle = '#06b6d4'; // body darker
      }
      ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    ctx.shadowBlur = 0; // reset
  }, []);

  // Update loop
  useEffect(() => {
    if (isGameOver || !isPlayingGame) {
      draw();
      return;
    }

    let animationId: number;
    let lastTime = 0;

    const loop = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;

      if (delta > SNAKE_SPEED) {
        moveSnake();
        lastTime = time;
      }

      draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationId);
  }, [isGameOver, isPlayingGame, moveSnake, draw]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault(); // Prevent scrolling
      }

      if (isGameOver || !isPlayingGame) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dirRef.current.x === 0) nextDirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dirRef.current.x === 0) nextDirRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isPlayingGame]);

  const startGame = () => {
    snakeRef.current = [{ x: Math.floor((CANVAS_SIZE / GRID_SIZE) / 2), y: Math.floor((CANVAS_SIZE / GRID_SIZE) / 2) }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = generateFood(snakeRef.current);
    setScore(0);
    setIsGameOver(false);
    setIsPlayingGame(true);

    if (!hasStartedMusicOnce) {
      setHasStartedMusicOnce(true);
      setIsPlayingMusic(true);
    }
  };

  const triggerKey = (key: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-mono relative flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Background Synthwave Grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#020617] to-[#020617] opacity-80" />

      {/* Main App Container */}
      <div className="z-10 w-full max-w-6xl flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8 xl:gap-16">
        
        {/* GAME SECTION */}
        <div className="flex flex-col items-center w-full max-w-[400px]">
          {/* Game Header */}
          <div className="w-full flex items-end justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black italic tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                SYNTHSNAKE
              </h1>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex gap-4 text-sm shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <span className="text-slate-400">SCORE <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">{score}</span></span>
              {highScore > 0 && (
                <span className="text-slate-400 hidden sm:inline">HIGH <span className="text-fuchsia-400 font-bold drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]">{highScore}</span></span>
              )}
            </div>
          </div>

          {/* Game Canvas */}
          <div className="relative border-4 border-slate-900 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.15)] bg-[#020617]">
            {/* Soft Neon Glow around canvas internal */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(34,211,238,0.2)] z-0" />
            
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full max-w-[400px] aspect-square block focus:outline-none bg-[#020617]"
            />

            {/* Overlays */}
            {!isPlayingGame && !isGameOver && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-900/40 text-cyan-400 border-2 border-cyan-400 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:bg-cyan-500/20 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all font-bold uppercase tracking-widest animate-pulse"
                >
                  <Gamepad2 size={24} /> Start System
                </button>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-[3px] flex flex-col items-center justify-center z-10 px-4 text-center">
                <h2 className="text-4xl sm:text-5xl font-black text-fuchsia-500 drop-shadow-[0_0_20px_rgba(217,70,239,0.8)] mb-2 uppercase">System Failure</h2>
                <p className="text-cyan-400 mb-8 font-mono shadow-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] text-lg">Final Score: {score}</p>
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 px-6 py-3 bg-fuchsia-900/40 text-fuchsia-400 border-2 border-fuchsia-400 rounded-lg shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:bg-fuchsia-500/20 hover:shadow-[0_0_30px_rgba(217,70,239,0.6)] transition-all font-bold uppercase tracking-widest"
                >
                  <RefreshCw size={24} /> Reboot Sequence
                </button>
              </div>
            )}
          </div>

          {/* Mobile D-Pad Controls */}
          {isPlayingGame && !isGameOver && (
            <div className="grid grid-cols-3 gap-2 mt-6 md:hidden w-64 z-10">
              <div />
              <button onClick={() => triggerKey('ArrowUp')} className="bg-slate-900 border border-cyan-500/40 rounded-lg p-4 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] active:bg-cyan-900/50 flex justify-center uppercase text-xs font-bold transition-all active:scale-95 text-center">Up</button>
              <div />
              <button onClick={() => triggerKey('ArrowLeft')} className="bg-slate-900 border border-cyan-500/40 rounded-lg p-4 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] active:bg-cyan-900/50 flex justify-center uppercase text-xs font-bold transition-all active:scale-95 text-center">Left</button>
              <button onClick={() => triggerKey('ArrowDown')} className="bg-slate-900 border border-cyan-500/40 rounded-lg p-4 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] active:bg-cyan-900/50 flex justify-center uppercase text-xs font-bold transition-all active:scale-95 text-center">Down</button>
              <button onClick={() => triggerKey('ArrowRight')} className="bg-slate-900 border border-cyan-500/40 rounded-lg p-4 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] active:bg-cyan-900/50 flex justify-center uppercase text-xs font-bold transition-all active:scale-95 text-center">Right</button>
            </div>
          )}
          
          {!isPlayingGame && <p className="mt-6 text-sm text-slate-500 hidden md:block">Use WASD or Arrow Keys to move</p>}
        </div>

        {/* AUDIO PLAYER SECTION */}
        <div className="w-full max-w-[400px]">
          <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(217,70,239,0.1)] flex flex-col gap-6 relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 shadow-[0_0_15px_rgba(217,70,239,0.8)]" />

            {/* Header */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-fuchsia-900/30 rounded-lg border border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                  <Terminal className="text-fuchsia-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100 tracking-wider font-sans">AUDIO_SYS</h2>
                  <p className="text-xs text-fuchsia-500/80 font-mono uppercase tracking-widest">v1.2.4 Active</p>
                </div>
              </div>
              <Equalizer isPlaying={isPlayingMusic} />
            </div>

            {/* Now Playing Display */}
            <div className="bg-[#020617] rounded-xl p-4 border border-slate-800 shadow-inner relative overflow-hidden">
              {/* Scanline effect wrapper */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none" />
              
              <p className="text-xs text-cyan-400 mb-1 font-semibold uppercase tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                Now Playing
              </p>
              <p className="text-sm text-slate-200 truncate font-sans font-medium tracking-wide">
                {TRACKS[currentTrackIndex].title}
              </p>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-between px-2">
              <button 
                onClick={prevTrack} 
                className="p-3 text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all"
              >
                <SkipBack size={26} />
              </button>
              
              <button 
                onClick={togglePlayMusic} 
                className="p-5 bg-[#020617] border border-cyan-400 rounded-full text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:bg-cyan-900/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 transition-all group"
              >
                {isPlayingMusic ? (
                  <Pause size={28} className="group-hover:drop-shadow-[0_0_8px_currentColor]" />
                ) : (
                  <Play size={28} className="translate-x-0.5 group-hover:drop-shadow-[0_0_8px_currentColor]" />
                )}
              </button>
              
              <button 
                onClick={nextTrack} 
                className="p-3 text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all"
              >
                <SkipForward size={26} />
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-4 pt-5 border-t border-slate-800/80 text-slate-400">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="hover:text-cyan-400 transition-colors focus:outline-none"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 h-1.5 appearance-none bg-slate-800 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_#22d3ee] cursor-pointer hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={TRACKS[currentTrackIndex].src}
        onEnded={nextTrack}
        className="hidden"
      />
    </div>
  );
}
