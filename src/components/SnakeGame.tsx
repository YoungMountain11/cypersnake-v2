import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Snowflake, Star, Trophy, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 200; // Slower for kids
const SPEED_UP_FACTOR = 0.7; 
const SLOW_DOWN_FACTOR = 1.5;
const POWERUP_DURATION = {
  LIGHTNING: 5000,
  ICE: 8000,
  EVOLVE: 10000,
};

type Point = { x: number; y: number };
type PowerUpType = 'LIGHTNING' | 'ICE' | 'EVOLVE' | null;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// --- Main Component ---
/**
 * SnakeGame Component - Cyberpunk 3D Edition
 * 
 * Optimized for kids:
 * - Slower movement.
 * - Wall penetration (wrapping).
 * - Cyberpunk neon aesthetics with 3D perspective.
 */
export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [nextDirection, setNextDirection] = useState<Point>({ x: 0, y: -1 });
  const [food, setFood] = useState<Point[]>([]);
  const [powerUp, setPowerUp] = useState<{ pos: Point; type: PowerUpType }>({ pos: { x: -1, y: -1 }, type: null });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType>(null);
  const [shake, setShake] = useState(0);
  
  // Refs for game loop to avoid stale closures
  const stateRef = useRef({
    snake,
    direction,
    nextDirection,
    food,
    powerUp,
    score,
    activePowerUp,
    gameOver,
    isPaused,
    particles: [] as Particle[],
    lastTick: 0,
    gridCount: 0,
  });

  // Sync refs
  useEffect(() => {
    stateRef.current.snake = snake;
    stateRef.current.direction = direction;
    stateRef.current.nextDirection = nextDirection;
    stateRef.current.food = food;
    stateRef.current.powerUp = powerUp;
    stateRef.current.score = score;
    stateRef.current.activePowerUp = activePowerUp;
    stateRef.current.gameOver = gameOver;
    stateRef.current.isPaused = isPaused;
  }, [snake, direction, nextDirection, food, powerUp, score, activePowerUp, gameOver, isPaused]);

  // --- Helper Functions ---
  const getRandomPos = useCallback((currentSnake: Point[]) => {
    let newPos: Point;
    const gridWidth = Math.floor((canvasRef.current?.width || 400) / GRID_SIZE);
    const gridHeight = Math.floor((canvasRef.current?.height || 400) / GRID_SIZE);
    
    do {
      newPos = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight),
      };
    } while (currentSnake.some(s => s.x === newPos.x && s.y === newPos.y));
    
    return newPos;
  }, []);

  const createExplosion = (x: number, y: number, color: string, count = 15) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      newParticles.push({
        x: x * GRID_SIZE + GRID_SIZE / 2,
        y: y * GRID_SIZE + GRID_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
        size: Math.random() * 3 + 2,
      });
    }
    stateRef.current.particles.push(...newParticles);
  };

  const triggerShake = () => {
    setShake(10);
    setTimeout(() => setShake(0), 200);
  };

  const resetGame = () => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    setSnake(initialSnake);
    setDirection({ x: 0, y: -1 });
    setNextDirection({ x: 0, y: -1 });
    setFood([getRandomPos(initialSnake)]);
    setPowerUp({ pos: { x: -1, y: -1 }, type: null });
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setActivePowerUp(null);
    stateRef.current.particles = [];
  };

  // --- Game Logic ---
  const moveSnake = useCallback(() => {
    const { snake, nextDirection, food, powerUp, score, activePowerUp } = stateRef.current;
    
    const head = snake[0];
    let newHead = {
      x: head.x + nextDirection.x,
      y: head.y + nextDirection.y,
    };

    const gridWidth = Math.floor((canvasRef.current?.width || 400) / GRID_SIZE);
    const gridHeight = Math.floor((canvasRef.current?.height || 400) / GRID_SIZE);

    // Wall Penetration (Wrapping)
    if (newHead.x < 0) newHead.x = gridWidth - 1;
    if (newHead.x >= gridWidth) newHead.x = 0;
    if (newHead.y < 0) newHead.y = gridHeight - 1;
    if (newHead.y >= gridHeight) newHead.y = 0;

    // Self-Collision Check
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      setGameOver(true);
      setIsPaused(true);
      if (score > highScore) setHighScore(score);
      return;
    }

    const newSnake = [newHead, ...snake];
    let ateFood = false;
    let newFood = [...food];
    let newScore = score;

    // Check Food
    const foodIndex = food.findIndex(f => f.x === newHead.x && f.y === newHead.y);
    if (foodIndex !== -1) {
      ateFood = true;
      newFood.splice(foodIndex, 1);
      const scoreGain = activePowerUp === 'EVOLVE' ? 20 : 10;
      newScore += scoreGain;
      createExplosion(newHead.x, newHead.y, '#00f3ff');
      triggerShake();
      
      if (newFood.length === 0) {
        newFood.push(getRandomPos(newSnake));
      }
    }

    // Check PowerUp
    let newActivePowerUp = activePowerUp;
    let newPowerUp = { ...powerUp };

    if (powerUp.type && newHead.x === powerUp.pos.x && newHead.y === powerUp.pos.y) {
      newActivePowerUp = powerUp.type;
      newPowerUp = { pos: { x: -1, y: -1 }, type: null };
      
      const colors = { LIGHTNING: '#f3ff00', ICE: '#00f3ff', EVOLVE: '#ff00ff' };
      createExplosion(newHead.x, newHead.y, colors[newActivePowerUp as keyof typeof colors], 30);
      triggerShake();

      if (newActivePowerUp === 'EVOLVE') {
        for (let i = 0; i < 5; i++) {
          newSnake.push({ ...newSnake[newSnake.length - 1] });
        }
      } else if (newActivePowerUp === 'ICE') {
        for (let i = 0; i < 10; i++) {
          newFood.push(getRandomPos(newSnake));
        }
      }

      setTimeout(() => {
        setActivePowerUp(prev => prev === newActivePowerUp ? null : prev);
      }, POWERUP_DURATION[newActivePowerUp as keyof typeof POWERUP_DURATION]);
    }

    if (!ateFood) {
      newSnake.pop();
    }

    if (!newPowerUp.type && Math.random() < 0.01) {
      const types: PowerUpType[] = ['LIGHTNING', 'ICE', 'EVOLVE'];
      newPowerUp = {
        pos: getRandomPos(newSnake),
        type: types[Math.floor(Math.random() * types.length)],
      };
    }

    setSnake(newSnake);
    setDirection(nextDirection);
    setFood(newFood);
    setPowerUp(newPowerUp);
    setScore(newScore);
    setActivePowerUp(newActivePowerUp);
  }, [getRandomPos, highScore]);

  // --- Rendering ---
  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { snake, food, powerUp, activePowerUp, particles } = stateRef.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background Effects
    if (activePowerUp === 'ICE') {
      ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);
    }

    // Draw Grid (Cyberpunk Style)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Draw Particles
    stateRef.current.particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) return false;
      
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1.0;

    // Draw Food (Pulsing Neon Orb)
    food.forEach(f => {
      const fx = f.x * GRID_SIZE + GRID_SIZE / 2;
      const fy = f.y * GRID_SIZE + GRID_SIZE / 2;
      const pulse = Math.sin(time / 150) * 2;
      
      const grad = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, GRID_SIZE / 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#00f3ff');
      grad.addColorStop(1, '#0066ff');
      
      ctx.shadowBlur = 20 + pulse * 2;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, (GRID_SIZE / 2.5) + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw PowerUp (Gem Shapes)
    if (powerUp.type) {
      const colors = { LIGHTNING: '#f3ff00', ICE: '#00f3ff', EVOLVE: '#ff00ff' };
      const color = colors[powerUp.type as keyof typeof colors];
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      
      const px = powerUp.pos.x * GRID_SIZE + GRID_SIZE / 2;
      const py = powerUp.pos.y * GRID_SIZE + GRID_SIZE / 2;
      const size = (GRID_SIZE / 2.2) + Math.sin(time / 200) * 2;

      ctx.beginPath();
      if (powerUp.type === 'LIGHTNING') {
        // Lightning Bolt Shape
        ctx.moveTo(px, py - size);
        ctx.lineTo(px - size/2, py);
        ctx.lineTo(px + size/4, py);
        ctx.lineTo(px, py + size);
        ctx.lineTo(px + size/2, py);
        ctx.lineTo(px - size/4, py);
        ctx.closePath();
      } else if (powerUp.type === 'ICE') {
        // Hexagon Crystal
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = px + size * Math.cos(angle);
          const y = py + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else if (powerUp.type === 'EVOLVE') {
        // Heart Gem
        ctx.moveTo(px, py + size/2);
        ctx.bezierCurveTo(px, py - size/4, px - size, py - size/2, px - size, py + size/4);
        ctx.bezierCurveTo(px - size, py + size, px, py + size * 1.2, px, py + size * 1.2);
        ctx.bezierCurveTo(px, py + size * 1.2, px + size, py + size, px + size, py + size/4);
        ctx.bezierCurveTo(px + size, py - size/2, px, py - size/4, px, py + size/2);
      }
      ctx.fill();
      
      // Inner shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(px - size/3, py - size/3, size/4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    }

    // Draw Snake (Neon 2D Blocks)
    snake.forEach((s, i) => {
      const isHead = i === 0;
      const x = s.x * GRID_SIZE;
      const y = s.y * GRID_SIZE;
      const size = GRID_SIZE - 2;

      let baseColor = isHead ? '#ff00ff' : '#aa00aa';
      if (activePowerUp === 'EVOLVE') {
        const hue = (time / 10 + i * 20) % 360;
        baseColor = `hsla(${hue}, 80%, 60%, 1)`;
      } else if (activePowerUp === 'LIGHTNING') {
        baseColor = isHead ? '#f3ff00' : '#b3b300';
      }

      ctx.fillStyle = baseColor;
      ctx.shadowBlur = isHead ? 20 : 10;
      ctx.shadowColor = baseColor;
      
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, size, size, 4);
      ctx.fill();

      // Subtle inner glow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, size - 4, size - 4);
      
      ctx.shadowBlur = 0;

      // Lightning Effect
      if (activePowerUp === 'LIGHTNING' && Math.random() > 0.7) {
        ctx.strokeStyle = '#f3ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.random() * GRID_SIZE, y + Math.random() * GRID_SIZE);
        ctx.lineTo(x + Math.random() * GRID_SIZE, y + Math.random() * GRID_SIZE);
        ctx.stroke();
      }
    });
  }, []);

  // --- Game Loop ---
  useEffect(() => {
    let animationFrameId: number;
    const loop = (time: number) => {
      const { isPaused, gameOver, activePowerUp, lastTick } = stateRef.current;
      if (!isPaused && !gameOver) {
        let speed = INITIAL_SPEED;
        if (activePowerUp === 'LIGHTNING') speed *= SPEED_UP_FACTOR;
        if (activePowerUp === 'ICE') speed *= SLOW_DOWN_FACTOR;
        if (time - lastTick > speed) {
          moveSnake();
          stateRef.current.lastTick = time;
        }
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) draw(ctx, time);
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [moveSnake, draw]);

  // --- Inputs ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { direction } = stateRef.current;
      switch (e.key) {
        case 'ArrowUp': if (direction.y === 0) setNextDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': if (direction.y === 0) setNextDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': if (direction.x === 0) setNextDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': if (direction.x === 0) setNextDirection({ x: 1, y: 0 }); break;
        case ' ': setIsPaused(prev => !prev); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleControl = (dir: Point) => {
    const { direction } = stateRef.current;
    if (dir.x !== 0 && direction.x === 0) setNextDirection(dir);
    if (dir.y !== 0 && direction.y === 0) setNextDirection(dir);
  };

  // --- Resize Canvas ---
  useEffect(() => {
    const resize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = Math.floor(width / GRID_SIZE) * GRID_SIZE;
        canvasRef.current.height = Math.floor(height / GRID_SIZE) * GRID_SIZE;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6 select-none bg-[#0a0a12] perspective-container">
      {/* HUD */}
      <div className="w-full max-w-2xl flex items-center justify-between bg-zinc-900/80 p-4 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(0,243,255,0.1)]">
        <div className="flex flex-col">
          <span className="text-xs text-cyan-500 uppercase tracking-widest font-bold">Data Points</span>
          <span className="text-3xl font-mono font-black text-cyan-400 neon-text-cyan">{score}</span>
        </div>
        
        <div className="flex gap-3">
          <AnimatePresence>
            {activePowerUp && (
              <motion.div 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 20, opacity: 0 }} 
                className={`flex items-center gap-2 px-4 py-2 rounded-full border font-black text-xs tracking-tighter
                  ${activePowerUp === 'LIGHTNING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(243,255,0,0.3)]' : ''}
                  ${activePowerUp === 'ICE' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(0,243,255,0.3)]' : ''}
                  ${activePowerUp === 'EVOLVE' ? 'bg-magenta-500/20 text-magenta-400 border-magenta-500/50 shadow-[0_0_15px_rgba(255,0,255,0.3)]' : ''}
                `}
              >
                {activePowerUp === 'LIGHTNING' && <Zap size={14} />}
                {activePowerUp === 'ICE' && <Snowflake size={14} />}
                {activePowerUp === 'EVOLVE' && <Star size={14} />}
                {activePowerUp} MODE
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs text-magenta-500 uppercase tracking-widest font-bold">Max Record</span>
          <span className="text-xl font-mono font-bold text-magenta-400 neon-text-magenta">{highScore}</span>
        </div>
      </div>

      {/* Game Board with 3D Tilt */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-2xl aspect-square bg-black rounded-2xl border-2 border-cyan-500/20 overflow-hidden tilt-3d"
        style={{ 
          transform: `translate(${Math.random() * shake - shake/2}px, ${Math.random() * shake - shake/2}px)`,
        }}
      >
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <canvas ref={canvasRef} className="relative z-10 w-full h-full" />
        
        {/* Overlays */}
        <AnimatePresence>
          {(isPaused || gameOver) && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-8"
            >
              {gameOver ? (
                <>
                  <h2 className="text-7xl font-black text-magenta-500 neon-text-magenta tracking-tighter italic">SYSTEM CRASH</h2>
                  <div className="text-center">
                    <p className="text-cyan-400 text-xl font-bold">Score: {score}</p>
                    <p className="text-zinc-500 text-sm mt-2">Don't worry! You can try again.</p>
                  </div>
                  <button 
                    onClick={resetGame}
                    className="group relative flex items-center gap-3 bg-cyan-500 text-black px-10 py-5 rounded-xl font-black text-2xl transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(0,243,255,0.5)]"
                  >
                    <RotateCcw size={28} />
                    REBOOT
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-7xl font-black text-cyan-400 neon-text-cyan tracking-tighter italic">STANDBY</h2>
                  <button 
                    onClick={resetGame}
                    className="bg-magenta-500 text-white px-14 py-5 rounded-xl font-black text-2xl transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(255,0,255,0.5)]"
                  >
                    INITIALIZE
                  </button>
                  <p className="text-cyan-500/50 text-sm animate-pulse font-bold tracking-[0.3em]">PRESS SPACE TO START</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-3 md:hidden">
        <div />
        <ControlButton icon={<ChevronUp />} onClick={() => handleControl({ x: 0, y: -1 })} color="cyan" />
        <div />
        <ControlButton icon={<ChevronLeft />} onClick={() => handleControl({ x: -1, y: 0 })} color="cyan" />
        <ControlButton icon={<ChevronDown />} onClick={() => handleControl({ x: 0, y: 1 })} color="cyan" />
        <ControlButton icon={<ChevronRight />} onClick={() => handleControl({ x: 1, y: 0 })} color="cyan" />
      </div>

      {/* Desktop Hints */}
      <div className="hidden md:flex gap-12 text-cyan-500/40 text-xs font-black tracking-[0.2em] uppercase">
        <div className="flex items-center gap-3">
          <kbd className="bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]">ARROWS</kbd>
          <span>Navigate</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className="bg-magenta-500/10 px-3 py-1.5 rounded-lg border border-magenta-500/30 text-magenta-400 shadow-[0_0_10px_rgba(255,0,255,0.2)]">SPACE</kbd>
          <span>Pause System</span>
        </div>
      </div>
    </div>
  );
}

function ControlButton({ icon, onClick, color }: { icon: React.ReactNode; onClick: () => void; color: string }) {
  return (
    <button 
      onPointerDown={onClick}
      className={`w-16 h-16 flex items-center justify-center bg-zinc-900/50 border border-cyan-500/20 rounded-2xl text-cyan-400 active:bg-cyan-500 active:text-black active:scale-90 transition-all shadow-lg`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 32 })}
    </button>
  );
}
