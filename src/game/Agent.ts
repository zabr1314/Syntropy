import Phaser from 'phaser';
import SpeechBubble from './SpeechBubble';
import { PathfindingManager } from './PathfindingManager';

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
    private bubble: SpeechBubble;
    private path: {x: number, y: number}[] = [];
    private currentPathTarget: {x: number, y: number} | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);
        
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

        // 创建气泡
        this.bubble = new SpeechBubble(scene, x, y - 40); // 调整气泡高度

        // 放大 Sprite
        this.setScale(3); // 放大到 3 倍
        
        // 播放 idle 动画作为默认状态
        if (this.anims.exists('idle')) {
            this.play('idle');
        } else {
            // 如果没有动画，至少设置第一帧
            this.setFrame(0);
        }
    }

    say(message: string, duration: number = 2000) {
        this.bubble.show(message, duration);
    }

    async moveTo(x: number, y: number) {
        console.log(`Agent requesting move to: ${x}, ${y}`);
        this._targetX = x;
        this._targetY = y;
        
        const scene = this.scene as SceneWithPathfinding;
        if (scene.pathfindingManager) {
            console.log('Calculating path...');
            const path = await scene.pathfindingManager.findPath(this.x, this.y, x, y);
            if (path.length > 0) {
                console.log(`Path found with ${path.length} steps`);
                this.path = path;
                this.currentPathTarget = this.path.shift() || null; // 取出第一个点 (通常是当前点或非常近的点)
                // 如果第一个点离自己太近，直接取下一个
                if (this.currentPathTarget && Phaser.Math.Distance.Between(this.x, this.y, this.currentPathTarget.x, this.currentPathTarget.y) < 10) {
                     this.currentPathTarget = this.path.shift() || null;
                }
            } else {
                console.warn('No path found!');
                // 降级处理：尝试直接移动（可能被卡住）
                this.path = [];
                this.currentPathTarget = { x, y };
            }
        } else {
            console.warn('Pathfinding manager not available, moving directly');
            this.path = [];
            this.currentPathTarget = { x, y };
        }
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        
        // 气泡跟随
        this.bubble.setPosition(this.x, this.y - 40);

        // 调试：每隔 60 帧打印一次状态
        if (this.scene.game.loop.frame % 60 === 0 && (this.path.length > 0 || this.currentPathTarget)) {
            console.log(`Agent [${this.texture.key}] Moving... Path length: ${this.path.length}`);
        }

        // 调试：绘制红色边框以确认位置
        // 注意：这非常耗性能，仅用于排查
        // const debugGraphics = this.scene.add.graphics();
        // debugGraphics.lineStyle(2, 0xff0000);
        // debugGraphics.strokeRect(this.x - 16, this.y - 16, 32, 32);
        // this.scene.time.delayedCall(20, () => debugGraphics.destroy());

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
                    this.setFrame(0);
                    if (this.anims.exists('idle')) {
                        this.play('idle');
                    }
                    console.log('Agent reached destination');
                }
            } else {
                // 继续向当前路点移动
                if (this.scene && this.scene.physics) {
                    this.scene.physics.moveTo(this, this.currentPathTarget.x, this.currentPathTarget.y, this.SPEED);
                    if (this.anims.exists('walk') && !this.anims.isPlaying) {
                        this.play('walk', true);
                    }
                }
            }
        } else {
            // 没有任何目标，确保停止
            if (this.body?.velocity.x !== 0 || this.body?.velocity.y !== 0) {
                this.body?.reset(this.x, this.y);
                this.stop();
                if (this.anims.exists('idle')) {
                    this.play('idle');
                }
            }
        }
    }
}
