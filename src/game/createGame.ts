import Phaser from 'phaser';
import { TempleScene } from './scenes/TempleScene';
import { InteriorScene } from './scenes/InteriorScene';

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#819a94', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [TempleScene, InteriorScene], render: { antialias: false, roundPixels: true },
  });
}
