import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from '../game/MainScene';
import { GameEventManager } from '../game/GameEventManager';

const GameContainer: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'phaser-game-container',
      width: 800,
      height: 600,
      backgroundColor: '#f0f0f0',
      scene: [MainScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);
    
    // 启动事件管理器
    GameEventManager.getInstance().start();

    return () => {
      // 停止事件管理器
      GameEventManager.getInstance().stop();
      
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
      <div id="phaser-game-container" className="w-full h-full" />
    </div>
  );
};

export default GameContainer;
