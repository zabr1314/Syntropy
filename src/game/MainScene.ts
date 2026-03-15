import Phaser from 'phaser';
import Agent from './Agent';
import { useAgentStore, type AgentState } from '../store/useAgentStore';
import { useConfigStore, type AgentConfig } from '../store/useConfigStore';
import { PathfindingManager } from './PathfindingManager';
import { getAgentConfig } from '../constants/agentConfig';

export class MainScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private agents: Map<string, Agent> = new Map();
  public pathfindingManager?: PathfindingManager;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    console.log('[MainScene] Preload started');
    
    this.load.on('filecomplete', (key: string, type: string) => {
        console.log(`[MainScene] File loaded: ${key} (${type})`);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
        console.error(`[MainScene] Load error: ${file.key}`, file.src);
    });

    this.load.on('complete', () => {
        console.log('[MainScene] Loader complete');
    });

    this.load.image('office_bg', 'assets/office_bg_small.jpg'); 
    // this.load.spritesheet('desk', 'assets/desk.webp', { frameWidth: 138, frameHeight: 107 });
    
    // 加载角色 Sprite Sheet
    // 皇帝行走图 (8帧动画, 1024x1024 sheet -> 256x256 frame)
    this.load.spritesheet('emperor', 'assets/emperor_new.png', { frameWidth: 256, frameHeight: 256 });
    // 丞相行走图 (8帧动画, 1024x1024 sheet -> 256x256 frame)
    this.load.spritesheet('minister_char', 'assets/minister_new.png', { frameWidth: 256, frameHeight: 256 });
    
    // 普通官员 (使用旧的 minister.png, 32x32, 4帧)
    this.load.spritesheet('generic_official', 'assets/minister.png', { frameWidth: 32, frameHeight: 32 });
    
    // 史官 (1024x1024 sheet -> 256x256 frame)
    this.load.spritesheet('historian_char', 'assets/historian.png', { frameWidth: 256, frameHeight: 256 });
    
    // 访客/通用 (32x32 frame) - 使用普通官员替代
    // this.load.spritesheet('guest', 'assets/guest_role.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('guest', 'assets/minister.png', { frameWidth: 32, frameHeight: 32 });
    
    // 户部/六部通用 (1024x1024 sheet -> 256x256 frame)
    this.load.spritesheet('revenue_char', 'assets/revenue.png', { frameWidth: 256, frameHeight: 256 });
    
    // 加载装饰物
    // this.load.spritesheet('plant', 'assets/plant.webp', { frameWidth: 160, frameHeight: 160 });
    // this.load.spritesheet('server', 'assets/server.webp', { frameWidth: 180, frameHeight: 251 });
    // this.load.spritesheet('poster', 'assets/poster.webp', { frameWidth: 160, frameHeight: 160 });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
        console.error('File load failed:', file.key, file.url);
    });
  }

  create() {
    const width = 800;
    const height = 600;

    // 交互层 (用于点击移动)
    const floorLayer = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    floorLayer.setInteractive();

    // 1. 动态层级 (Y-Sorting)
    this.events.on('update', () => {
        this.children.each((child: Phaser.GameObjects.GameObject) => {
            if ('texture' in child) {
                const texObj = child as Phaser.GameObjects.Image;
                if (texObj.texture && texObj.texture.key === 'office_bg') {
                    texObj.setDepth(-100);
                    return;
                }
            }
            
            if (child === floorLayer) {
                floorLayer.setDepth(0);
                return;
            }
            
            if (child.type === 'Text') {
                (child as Phaser.GameObjects.Text).setDepth(99999);
                return;
            }
            
            if ('y' in child) {
                const posObj = child as Phaser.GameObjects.Sprite;
                if (typeof posObj.y === 'number') {
                    posObj.setDepth(posObj.y);
                }
            }
        });
    });

    // 背景图
    // const bg = this.add.image(width / 2, height / 2, 'office_bg');
    // bg.setDepth(-100); 
    // const scaleX = width / bg.width;
    // const scaleY = height / bg.height;
    // const scale = Math.max(scaleX, scaleY);
    // bg.setScale(scale).setScrollFactor(0);

    // 尝试加载图片 (如果加载成功)
    const tryAddBg = () => {
        console.log('[MainScene] Checking texture: office_bg', this.textures.exists('office_bg'));
        if (this.textures.exists('office_bg')) {
            const bgImg = this.add.image(width / 2, height / 2, 'office_bg');
            bgImg.setDepth(-99); // 在黑色背景之上
            const scaleX = width / bgImg.width;
            const scaleY = height / bgImg.height;
            const scale = Math.max(scaleX, scaleY);
            bgImg.setScale(scale).setScrollFactor(0);
            
            // 确保没有被意外隐藏
            bgImg.setVisible(true);
            bgImg.setAlpha(1);

            console.log('[MainScene] Background added', { 
                width: bgImg.width, 
                height: bgImg.height, 
                scale,
                x: bgImg.x,
                y: bgImg.y,
                visible: bgImg.visible,
                alpha: bgImg.alpha,
                depth: bgImg.depth
            });
            return true;
        }
        return false;
    };

    if (!tryAddBg()) {
        console.log('[MainScene] Texture not ready, waiting for load complete...');
        // Fallback: Listen for load complete if not ready yet
        this.load.once('complete', () => {
             console.log('[MainScene] Load complete event fired, retrying addBg...');
             tryAddBg();
        });
        // Force start load if not started (though preload should have done it)
        if (this.load.isLoading()) {
            console.log('[MainScene] Loader is currently busy...');
        } else {
            console.log('[MainScene] Loader idle, forcing start...');
            this.load.start();
        }
    }

    // 交互层 (用于点击移动)
    const floor = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    floor.setInteractive();

    // 初始化寻路系统
    this.pathfindingManager = new PathfindingManager(this);
    this.pathfindingManager.initGrid(width, height);

    // 添加障碍物 (Wall Obstacles)
    const wallThickness = 50;
    this.pathfindingManager.addObstacle(0, 0, width, wallThickness);
    this.pathfindingManager.addObstacle(0, height - wallThickness, width, wallThickness);
    this.pathfindingManager.addObstacle(0, 0, wallThickness, height);
    this.pathfindingManager.addObstacle(width - wallThickness, 0, wallThickness, height);

    // 内部障碍物 (Furniture Obstacles)
    this.pathfindingManager.addObstacle(50, 50, 100, 20);  // 书架 1
    this.pathfindingManager.addObstacle(50, 150, 100, 20); // 书架 2
    this.pathfindingManager.addObstacle(50, height - 100, 20, 80); // 机柜 1
    this.pathfindingManager.addObstacle(100, height - 100, 20, 80); // 机柜 2
    this.pathfindingManager.addObstacle(width / 2 - 40, 50, 80, 40); // 龙椅
    this.pathfindingManager.addObstacle(width / 2 - 140, 0, 20, 250); // 左立柱
    this.pathfindingManager.addObstacle(width / 2 + 120, 0, 20, 250); // 右立柱
    this.pathfindingManager.addObstacle(width / 2 - 200, 220, 80, 100); // 左屏风
    this.pathfindingManager.addObstacle(width / 2 + 120, 220, 80, 100); // 右屏风

    // 交互反馈
    floor.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 视觉反馈
      const feedback = this.add.circle(pointer.x, pointer.y, 5, 0x00ff00);
      feedback.setDepth(9999);
      
      this.tweens.add({
        targets: feedback,
        scale: 4, 
        alpha: 0,
        duration: 300,
        ease: 'Cubic.out',
        onComplete: () => feedback.destroy()
      });

      const { setTargetPosition, addLog } = useAgentStore.getState();
      const x = Phaser.Math.Clamp(pointer.x, 50, width - 50);
      const y = Phaser.Math.Clamp(pointer.y, 50, height - 50);
      
      setTargetPosition('emperor', x, y);
      addLog(`指令：点击移动 Emperor 到 (${Math.round(x)}, ${Math.round(y)})`);
    });

    // 绘制办公桌 (暂时移除，因资源缺失且会导致绿色占位符)
    // this.createDesk(250, 250);
    // this.createDesk(width - 250, height - 250);

    // 创建动画
    this.createAnimations();

    // 初始化 Agents 到 Store (基于 ConfigStore 的真实配置)
    const { agents: liveAgents, addAgent, removeAgent } = useAgentStore.getState();
    const { agents: configAgents } = useConfigStore.getState();

    // 1. 清理：移除不在配置中的角色 (清理幽灵数据)
    Object.keys(liveAgents).forEach(roleId => {
        if (!configAgents.find(c => c.role === roleId)) {
            removeAgent(roleId);
        }
    });

    // 2. 新增：确保配置中的角色都已加载
    configAgents.forEach((config: AgentConfig) => {
         if (!liveAgents[config.role]) {
             // 获取完整的配置信息（包括位置等）
             const fullConfig = getAgentConfig(config.role);
             // 安全获取初始位置，避免 undefined
             const initialX = fullConfig.initialPos ? fullConfig.initialPos.x : 100;
             const initialY = fullConfig.initialPos ? fullConfig.initialPos.y : 100;
             
             addAgent({ 
                 id: config.role, 
                 x: initialX, 
                 y: initialY, 
                 texture: fullConfig.texture || 'guest', 
                 targetPosition: null, 
                 status: 'idle' 
            });
         }
    });

    // 3. 强制确保皇帝存在 (Fallback for Emperor)
    if (!liveAgents['emperor'] && !configAgents.find(c => c.role === 'emperor')) {
        const emperorConfig = getAgentConfig('emperor');
        addAgent({
            id: 'emperor',
            x: emperorConfig.initialPos?.x || 400,
            y: emperorConfig.initialPos?.y || 300,
            texture: 'emperor',
            targetPosition: null,
            status: 'idle'
        });
    }


    // 初始同步
    this.syncAgents(useAgentStore.getState().agents);

    // 订阅 Store 变化
    let currentAgents = useAgentStore.getState().agents;
    
    this.unsubscribe = useAgentStore.subscribe((state) => {
      if (!this.sys || !this.sys.isActive()) return;
      const newAgents = state.agents;
      if (newAgents !== currentAgents) {
        currentAgents = newAgents;
        this.syncAgents(newAgents);
      }
    });

    this.events.on('shutdown', () => {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    });
  }

  createAnimations() {
      // 皇帝
      this.anims.create({ key: 'emperor_idle', frames: this.anims.generateFrameNumbers('emperor', { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
      this.anims.create({ key: 'emperor_walk', frames: this.anims.generateFrameNumbers('emperor', { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
      
      // 丞相
      this.anims.create({ key: 'minister_char_idle', frames: this.anims.generateFrameNumbers('minister_char', { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
      this.anims.create({ key: 'minister_char_walk', frames: this.anims.generateFrameNumbers('minister_char', { start: 0, end: 7 }), frameRate: 12, repeat: -1 });

      // 尚书 (通用)
      this.anims.create({ key: 'revenue_char_idle', frames: this.anims.generateFrameNumbers('revenue_char', { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
      this.anims.create({ key: 'revenue_char_walk', frames: this.anims.generateFrameNumbers('revenue_char', { start: 0, end: 7 }), frameRate: 12, repeat: -1 });

      // 史官
      this.anims.create({ key: 'historian_char_idle', frames: this.anims.generateFrameNumbers('historian_char', { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
      this.anims.create({ key: 'historian_char_walk', frames: this.anims.generateFrameNumbers('historian_char', { start: 0, end: 7 }), frameRate: 12, repeat: -1 });

      // 普通官员
      this.anims.create({ key: 'generic_official_idle', frames: this.anims.generateFrameNumbers('generic_official', { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
      this.anims.create({ key: 'generic_official_walk', frames: this.anims.generateFrameNumbers('generic_official', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
      
      // 桌子 (已移除资源)
      // this.anims.create({ key: 'desk_anim', frames: this.anims.generateFrameNumbers('desk', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
  }

  syncAgents(agentsState: Record<string, AgentState>) {
    // 1. 处理移除
    for (const [id, agent] of this.agents.entries()) {
        if (!agentsState[id]) {
            agent.destroy();
            this.agents.delete(id);
        }
    }

    // 2. 处理新增和更新
    for (const [id, state] of Object.entries(agentsState)) {
        let agent = this.agents.get(id);

        if (!agent) {
            // 获取配置
            const config = getAgentConfig(id);
            agent = new Agent(this, state.x, state.y, state.texture, config);
            this.agents.set(id, agent);
        }

        if (agent && agent.active) {
            if (state.status === 'working') {
                agent.clearTint();
                if (state.targetPosition) {
                     const dist = Phaser.Math.Distance.Between(agent.x, agent.y, state.targetPosition.x, state.targetPosition.y);
                     if (dist < 10) {
                         agent.playWorkAnimation();
                     } else {
                         agent.moveTo(state.targetPosition.x, state.targetPosition.y);
                     }
                } else {
                    agent.playWorkAnimation();
                }
            } else {
                agent.clearTint();
                agent.stopWorkAnimation();
                
                if (state.targetPosition) {
                    const currentTargetX = agent.targetX;
                    const currentTargetY = agent.targetY;
                    const newTargetX = state.targetPosition.x;
                    const newTargetY = state.targetPosition.y;

                    // 只有当目标位置确实改变，且当前不在该位置附近时，才移动
                    // 阈值设为 4px (与 Agent.ts 中的判定一致)
                    const distToNewTarget = Phaser.Math.Distance.Between(agent.x, agent.y, newTargetX, newTargetY);
                    
                    if (distToNewTarget > 4) {
                         // 再次检查是否已经是当前正在前往的目标
                         if (currentTargetX !== newTargetX || currentTargetY !== newTargetY) {
                             agent.moveTo(newTargetX, newTargetY);
                         }
                    }
                }
            }

            // Minister/emperor: stream LLM content live, then typewriter on idle.
            // Officials: show fixed template bubbles (set by LiveAgentService).
            const isMinisterOrEmperor = id === 'minister' || id === 'emperor';
            if (state.message) {
                if (isMinisterOrEmperor) {
                    if (state.status === 'working') {
                        agent.streamSay(state.message);
                    } else if (state.status === 'idle') {
                        const duration = Math.max(3000, Math.min(10000, (state.message.length / 5) * 1000));
                        agent.say(state.message, duration, 'high');
                    }
                } else {
                    // Officials: always use say() with short duration for template text
                    if (state.status === 'working') {
                        agent.say(state.message, 999999, 'high'); // persist until idle
                    } else if (state.status === 'idle') {
                        if (state.message) {
                            agent.say(state.message, 2000, 'high');
                        } else {
                            agent.forceStop();
                        }
                    }
                }
            }
        }
    }
  }

  update() {
    // Phaser update loop
  }

  createDesk(x: number, y: number) {
    if (this.pathfindingManager) {
        this.pathfindingManager.addObstacle(x - 69, y - 53, 138, 107);
    }
  }
}