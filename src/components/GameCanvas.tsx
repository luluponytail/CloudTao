import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export function GameCanvas({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !host.current) return;
    let game: Phaser.Game | undefined;
    let cancelled = false;
    const parent = host.current;
    import('../game/createGame').then(({ createGame }) => {
      if (!cancelled) game = createGame(parent);
    });
    return () => { cancelled = true; game?.destroy(true); };
  }, [active]);
  return <div ref={host} className="game-canvas" aria-label="Interactive Cloud Tao temple map" />;
}
