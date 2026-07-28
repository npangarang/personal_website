import GameCanvas from '@/components/GameCanvas';

export default function GamePage() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a1a]">
      <GameCanvas />
    </div>
  );
}
