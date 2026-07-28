import { useEffect, useRef } from 'react';
import { Game } from '@/game/game';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const game = new Game(canvas);
    gameRef.current = game;
    game.start();

    return () => {
      window.removeEventListener('resize', resize);
      game.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        cursor: 'none',
        background: '#0a0a1a',
      }}
    />
  );
}
