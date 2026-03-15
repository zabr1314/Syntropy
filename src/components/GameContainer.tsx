import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from '../game/MainScene';
import { LiveAgentService } from '../services/LiveAgentService';

const GameContainer: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'phaser-game-container',
      width: 800,
      height: 600,
      backgroundColor: '#000000',
      pixelArt: true, // Enable pixel art mode for crisp rendering
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
      },
      input: {
        mouse: {
          preventDefaultWheel: false
        },
        touch: {
            capture: false
        }
      }
    };

    gameRef.current = new Phaser.Game(config);
    
    // 启动实时代理服务，接入 OpenClaw 数据
    LiveAgentService.getInstance().start();
    
    // 原有的随机事件管理器暂时停用，避免冲突
    // GameEventManager.getInstance().start();

    return () => {
      // 停止服务
      LiveAgentService.getInstance().stop();
      
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center">
      <div id="phaser-game-container" className="w-full h-full flex items-center justify-center" />
    </div>
  );
};

export default GameContainer;
