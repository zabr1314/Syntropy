import Phaser from 'phaser';
import SpeechBubble from './SpeechBubble';
import { PathfindingManager } from './PathfindingManager';
import { type AgentConfig } from '../constants/agentConfig';

interface SceneWithPathfinding extends Phaser.Scene {
    pathfindingManager?: PathfindingManager;
}

export default class Agent extends Phaser.Physics.Arcade.Sprite {
    // Public getter for target position to avoid duplicate moves
    get targetX() { return this._targetX; }
    get targetY() { return this._targetY; }

    private _targetX: number | null = null;
    private _targetY: number | null = null;
    private readonly SPEED: number = 200;
    
    // Config properties
    private config: AgentConfig;
    private bubble: SpeechBubble;
    
    private path: {x: number, y: number}[] = [];
    private currentPathTarget: {x: number, y: number} | null = null;
    private nameTag!: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, config: AgentConfig) {
        super(scene, x, y, texture);
        this.config = config;
        
        // 调试信息：输出纹理是否加载成功
        if (!scene.textures.exists(texture)) {
            console.error(`Texture '${texture}' not found!`);
        } else {
            console.log(`Agent created with texture '${texture}'`);
        }

        // 将对象添加到场景和物理系统中
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // 设置与世界边界碰撞
        this.setCollideWorldBounds(true);
        this.setDepth(100); // 确保在最上层

        // 应用缩放配置
        this.setScale(this.config.scale);

        // 创建气泡
        this.bubble = new SpeechBubble(scene, x, y - this.config.bubbleOffsetY);

        // 创建铭牌
        this.createNameTag(scene);
        
        // 播放 idle 动画作为默认状态
        this.playIdleAnimation();
    }

    private createNameTag(scene: Phaser.Scene) {
        // 创建容器
        // 初始位置，preUpdate 会每帧更新
        this.nameTag = scene.add.container(this.x, this.y + 45 + this.config.nameTagOffsetY);
        this.nameTag.setDepth(200); // 确保在 Agent 之上

        // 创建背景 (圆角矩形)
        const bg = scene.add.graphics();
        
        // 创建文字
        const text = scene.add.text(0, 0, this.config.name, {
            fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold'
        });
        text.setResolution(3); // 再次提高清晰度，解决模糊问题
        text.setOrigin(0.5, 0.5);

        // 动态计算背景大小
        const paddingX = 8;
        const paddingY = 4;
        const width = text.width + paddingX * 2;
        const height = text.height + paddingY * 2;
        
        // 绘制背景：极简风格，无边框，更淡的黑色背景
        bg.fillStyle(0x000000, 0.5); // 0.5 透明度
        bg.fillRoundedRect(-width/2, -height/2, width, height, 8); // 略微减小圆角

        this.nameTag.add(bg);
        this.nameTag.add(text);
    }

    private currentMessage: string | null = null;
    private currentPriority: 'low' | 'high' = 'low';

    say(message: string, duration: number = 2000, priority: 'low' | 'high' = 'low') {
        // 如果当前有高优先级消息正在显示，且新消息是低优先级的，则忽略新消息
        if (this.currentPriority === 'high' && priority === 'low' && this.bubble.visible) {
            return;
        }

        // 如果消息没有变化，且气泡正在显示，则忽略
        if (this.currentMessage === message && this.bubble.visible) {
            return;
        }

        this.currentMessage = message;
        this.currentPriority = priority;
        this.bubble.show(message, duration);
    }

    /**
     * streamSay() — called on every streaming chunk.
     * Immediately renders the latest buffer text without typewriter or timer resets.
     */
    streamSay(message: string) {
        this.currentMessage = message;
        this.currentPriority = 'high';
        this.bubble.stream(message);
    }

    private workTween: Phaser.Tweens.Tween | null = null;

    forceStop() {
        this.path = [];
        this.currentPathTarget = null;
        this._targetX = null;
        this._targetY = null;
        this.body?.reset(this.x, this.y);
        this.stop();
        this.stopWorkAnimation();
        this.playIdleAnimation();
    }

    playWorkAnimation() {
        if (this.workTween && this.workTween.isPlaying()) return;
        
        // 沉思/呼吸动画 (Breathing/Bobbing)
        // 仅在 Y 轴微小浮动，表现专注
        this.workTween = this.scene.tweens.add({
            targets: this,
            y: this.y - 2, // 仅上浮 2px
            duration: 1500, // 缓慢呼吸
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopWorkAnimation() {
        if (this.workTween) {
            this.workTween.stop();
            this.workTween = null;
        }
        // 强制重置缩放
        this.setScale(this.config.scale);
    }

    async moveTo(x: number, y: number) {
        // console.log(`Agent requesting move to: ${x}, ${y}`);
        this.stopWorkAnimation(); // 移动时停止工作动画
        
        // 移除启动时的弹性动画 (Jump start) 以符合严肃风格
        
        this._targetX = x;
        this._targetY = y;
        
        const scene = this.scene as SceneWithPathfinding;
        if (scene.pathfindingManager) {
            // console.log('Calculating path...');
            const path = await scene.pathfindingManager.findPath(this.x, this.y, x, y);
            if (path.length > 0) {
                // console.log(`Path found with ${path.length} steps`);
                this.path = path;
                this.currentPathTarget = this.path.shift() || null; 
                if (this.currentPathTarget && Phaser.Math.Distance.Between(this.x, this.y, this.currentPathTarget.x, this.currentPathTarget.y) < 10) {
                     this.currentPathTarget = this.path.shift() || null;
                }
            } else {
                console.warn('No path found!');
                this.path = [];
                this.currentPathTarget = { x, y };
            }
        } else {
            console.warn('Pathfinding manager not available, moving directly');
            this.path = [];
            this.currentPathTarget = { x, y };
        }
    }

    destroy(fromScene?: boolean) {
        if (this.bubble) {
            this.bubble.destroy();
        }
        if (this.nameTag) {
            this.nameTag.destroy();
        }
        super.destroy(fromScene);
    }

    // 统一处理移动/停止的动画播放
    playMoveAnimation() {
        const animKey = `${this.texture.key}_walk`;
        if (this.anims.exists(animKey) && !this.anims.isPlaying) {
            this.play(animKey, true);
        } else if (this.anims.exists('walk') && !this.anims.isPlaying) {
            this.play('walk', true);
        }
    }

    playIdleAnimation() {
        const animKey = `${this.texture.key}_idle`;
        if (this.anims.exists(animKey)) {
            this.play(animKey, true);
        } else if (this.anims.exists('idle')) {
            this.play('idle', true);
        } else {
            this.setFrame(0);
        }
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        
        // 气泡跟随
        this.bubble.setPosition(this.x, this.y - this.config.bubbleOffsetY);

        // 铭牌跟随
        if (this.nameTag) {
            this.nameTag.setPosition(this.x, this.y + 45 + this.config.nameTagOffsetY);
            this.nameTag.setDepth(this.y + 1000); 
        }

        // 根据速度翻转 Sprite
        if (this.body && this.body.velocity.x !== 0) {
            this.setFlipX(this.body.velocity.x < 0);
        }

        // 移动逻辑
        if (this.currentPathTarget) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.currentPathTarget.x, this.currentPathTarget.y);
            
            if (dist < 4) {
                // 到达当前路点
                this.body?.reset(this.currentPathTarget.x, this.currentPathTarget.y);
                
                // 获取下一个路点
                if (this.path.length > 0) {
                    this.currentPathTarget = this.path.shift() || null;
                } else {
                    // 路径走完，到达终点
                    this.currentPathTarget = null;
                    this._targetX = null;
                    this._targetY = null;
                    this.stop();
                    this.playIdleAnimation();
                    // console.log('Agent reached destination');
                }
            } else {
                // 继续向当前路点移动
                if (this.scene && this.scene.physics) {
                    this.scene.physics.moveTo(this, this.currentPathTarget.x, this.currentPathTarget.y, this.SPEED);
                    this.playMoveAnimation();
                }
            }
        } else {
            // 没有任何目标，确保停止
            if (this.body?.velocity.x !== 0 || this.body?.velocity.y !== 0) {
                this.body?.reset(this.x, this.y);
                this.stop();
                this.playIdleAnimation();
            }
        }
    }
}