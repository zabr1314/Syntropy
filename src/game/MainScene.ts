import Phaser from 'phaser';
import Agent from './Agent';
import { useAgentStore, type AgentState } from '../store/useAgentStore';
import { PathfindingManager } from './PathfindingManager';

export class MainScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private agents: Map<string, Agent> = new Map();
  public pathfindingManager?: PathfindingManager;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.image('office_bg', 'assets/office_bg.png'); // 加载新的 .png 背景
    // 桌子改为 spritesheet
    // 图片尺寸 276x214，推测为 2x2 的网格，单帧尺寸 138x107
    this.load.spritesheet('desk', 'assets/desk.webp', { frameWidth: 138, frameHeight: 107 });
    // 使用新的角色 Sprite Sheet (guest_role.png)
    this.load.spritesheet('guest', 'assets/guest_role.png', { frameWidth: 32, frameHeight: 32 });
    
    // 加载装饰物
    this.load.spritesheet('plant', 'assets/plant.webp', { frameWidth: 160, frameHeight: 160 });
    // this.load.image('coffee_machine', 'assets/coffee_machine.webp'); // 咖啡机暂时当单图用，或者切片
    this.load.spritesheet('server', 'assets/server.webp', { frameWidth: 180, frameHeight: 251 });
    this.load.spritesheet('poster', 'assets/poster.webp', { frameWidth: 160, frameHeight: 160 });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
        console.error('File load failed:', file.key, file.url);
    });
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // 交互层 (用于点击移动)
    const floorLayer = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    floorLayer.setInteractive();

    // 1. 动态层级 (Y-Sorting)
    // 开启 Y-Sorting，每一帧自动根据 Y 坐标调整深度
    this.events.on('update', () => {
        this.children.each((child: Phaser.GameObjects.GameObject) => {
            // 背景层级固定为 -100
            // 使用 'texture' in child 检查属性，然后强转为 Image/Sprite
            if ('texture' in child) {
                const texObj = child as Phaser.GameObjects.Image;
                if (texObj.texture && texObj.texture.key === 'office_bg') {
                    texObj.setDepth(-100);
                    return;
                }
            }
            
            // 地板交互层固定为 0
            if (child === floorLayer) {
                floorLayer.setDepth(0);
                return;
            }
            
            // 文字标签固定在最上层
            if (child.type === 'Text') {
                (child as Phaser.GameObjects.Text).setDepth(99999);
                return;
            }
            
            // 动态物体 (Agent, Desk, Decor) 根据 Y 坐标设置层级
            // Y 越大（越靠下），层级越高（遮挡上面的物体）
            if ('y' in child) {
                const posObj = child as Phaser.GameObjects.Sprite;
                if (typeof posObj.y === 'number') {
                    posObj.setDepth(posObj.y);
                }
            }
        });
    });

    // 背景图
    // 恢复背景图
    const bg = this.add.image(width / 2, height / 2, 'office_bg');
    bg.setDepth(-100); // 确保背景在最底层
    
    // 调整背景图大小以覆盖全屏，保持比例
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale).setScrollFactor(0);

    // 交互层 (用于点击移动)
    const floor = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    floor.setInteractive();

    // 区域定义
    // 假设背景图布局：
    // 左上：休息区 (Breakroom)
    // 左下：机房 (Server Room)
    // 右上：会议室 (Meeting Room)
    // 右下：办公区 (Work Area)
    
    // 初始化寻路系统
    this.pathfindingManager = new PathfindingManager(this);
    this.pathfindingManager.initGrid(width, height);

    // 添加四面墙壁的障碍物
    // 假设墙壁厚度为 50 像素
    const wallThickness = 50;
    // 上墙
    this.pathfindingManager.addObstacle(0, 0, width, wallThickness);
    // 下墙
    this.pathfindingManager.addObstacle(0, height - wallThickness, width, wallThickness);
    // 左墙
    this.pathfindingManager.addObstacle(0, 0, wallThickness, height);
    // 右墙
    this.pathfindingManager.addObstacle(width - wallThickness, 0, wallThickness, height);

    // 绘制调试网格 (仅调试时开启)
    // this.pathfindingManager.drawDebug();

    // 根据新地图布局添加障碍物 (估算坐标)
    // 1. 左上角书架区 (藏书阁) - 占据左侧 1/3，顶部 1/2
    this.pathfindingManager.addObstacle(0, 0, width * 0.35, height * 0.45);
    
    // 2. 左下角办公区 (军机处) - 占据左侧 1/3，底部 1/2 (留出中间过道)
    this.pathfindingManager.addObstacle(0, height * 0.55, width * 0.35, height * 0.45);

    // 3. 中间上方太和殿 (Throne) - 占据中间 1/3，顶部 1/3
    this.pathfindingManager.addObstacle(width * 0.35, 0, width * 0.3, height * 0.35);

    // 4. 右侧墙壁分隔 (假设右侧有几个小房间)
    // 右上房间墙
    this.pathfindingManager.addObstacle(width * 0.7, 0, 20, height * 0.4);
    // 右下房间墙
    this.pathfindingManager.addObstacle(width * 0.7, height * 0.6, 20, height * 0.4);

    // 机房区域 (Server Room) - 仅文字
    const serverX = 150;
    const serverY = height - 150;
    this.add.text(serverX, serverY, '军机处', {
        fontFamily: 'ArkPixel, monospace',
        fontSize: '16px',
        color: '#00ff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(20);

    // 会议室区域 (Meeting Room) - 仅文字
    const meetingX = width - 150;
    const meetingY = 150;
    this.add.text(meetingX, meetingY, '太和殿', {
        fontFamily: 'ArkPixel, monospace',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(20);

    // 休息区 (Breakroom) - 仅文字
    const breakroomX = 150;
    const breakroomY = 150;
    this.add.text(breakroomX, breakroomY, '藏书阁', {
        fontFamily: 'ArkPixel, monospace',
        fontSize: '16px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(20);

    // 办公区 (Work Area) - 仅文字
    const workX = width - 200;
    const workY = height - 200;
    this.add.text(workX, workY, '午门', {
        fontFamily: 'ArkPixel, monospace',
        fontSize: '16px',
        color: '#00ffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(20);

    floor.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('Floor clicked at:', pointer.x, pointer.y);
      
      // 4. 交互反馈 (Juice)
      // 视觉反馈：在点击位置播放一个小动画
      const feedback = this.add.circle(pointer.x, pointer.y, 5, 0x00ff00);
      feedback.setDepth(9999); // 确保反馈在最上层
      
      this.tweens.add({
        targets: feedback,
        scale: 4, // 扩散
        alpha: 0,
        duration: 300,
        ease: 'Cubic.out',
        onComplete: () => feedback.destroy()
      });

      const { setTargetPosition, addLog } = useAgentStore.getState();
      // 简单的边界检查
      const x = Phaser.Math.Clamp(pointer.x, 50, width - 50);
      const y = Phaser.Math.Clamp(pointer.y, 50, height - 50);
      
      console.log('Setting target position:', x, y);
      
      // 更新 Store，完全由 Store 驱动 Agent 移动
      setTargetPosition('minister', x, y);
      addLog(`指令：点击移动 Minister 到 (${Math.round(x)}, ${Math.round(y)})`);
    });

    // 绘制办公桌
    // 根据新布局调整位置
    // 左下 (机房旁)
    // this.createDesk(250, height - 150);
    // 右下 (办公区) - 只添加这一张
    // this.createDesk(width - 250, height - 150);

    // 添加简单的文字说明
    this.add.text(width / 2, 30, '帝国中枢布局', {
      fontSize: '24px',
      color: '#000000'
    }).setOrigin(0.5).setDepth(20);

    // 创建动画
    // 新角色动画
    this.anims.create({
        key: 'idle', 
        frames: this.anims.generateFrameNumbers('guest', { start: 0, end: 3 }), // 假设前4帧是待机/行走
        frameRate: 6,
        repeat: -1
    });
    
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('guest', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
    });

    // 桌子动画
    this.anims.create({
        key: 'desk_anim',
        frames: this.anims.generateFrameNumbers('desk', { start: 0, end: 3 }), // 假设有 4 帧
        frameRate: 4,
        repeat: -1
    });

    // 初始化 Agents 到 Store (如果 Store 为空)
    const { agents, addAgent } = useAgentStore.getState();
    if (Object.keys(agents).length === 0) {
        // 调整初始位置，避免出生在墙里
        // 丞相 (Minister) - 在太和殿下方
        addAgent({ id: 'minister', x: width * 0.5, y: height * 0.45, texture: 'guest', targetPosition: null, status: 'idle' });
        // 工部 (Engineer) - 在藏书阁门口 (左侧中间)
        addAgent({ id: 'engineer', x: width * 0.4, y: height * 0.5, texture: 'guest', targetPosition: null, status: 'idle' });
        // 侍卫/职员 - 分布在右侧走廊
        addAgent({ id: 'staff_1', x: width * 0.8, y: height * 0.5, texture: 'guest', targetPosition: null, status: 'idle' });
        addAgent({ id: 'staff_2', x: width * 0.8, y: height * 0.8, texture: 'guest', targetPosition: null, status: 'idle' });
        addAgent({ id: 'staff_3', x: width * 0.8, y: height * 0.2, texture: 'guest', targetPosition: null, status: 'idle' });
    }

    // 初始同步
    this.syncAgents(useAgentStore.getState().agents);

    // 订阅 Store 变化 (仅监听 agents 变化)
    // 手动实现 selector 逻辑，避免每次更新都执行繁重的 DOM 操作
    let currentAgents = useAgentStore.getState().agents;
    
    this.unsubscribe = useAgentStore.subscribe((state) => {
      // 场景检查：如果场景不可用或已暂停，不执行
      if (!this.sys || !this.sys.isActive()) return;

      const newAgents = state.agents;
      
      // 简单的引用比较，因为 Zustand 每次更新都会返回新的对象
      if (newAgents !== currentAgents) {
        currentAgents = newAgents;
        this.syncAgents(newAgents);
      }
    });

    // 清理订阅
    this.events.on('shutdown', () => {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    });
  }

  syncAgents(agentsState: Record<string, AgentState>) {
    // 1. 处理移除的 Agent
    for (const [id, agent] of this.agents.entries()) {
        if (!agentsState[id]) {
            agent.destroy();
            this.agents.delete(id);
        }
    }

    // 2. 处理新增和更新的 Agent
    for (const [id, state] of Object.entries(agentsState)) {
        let agent = this.agents.get(id);

        // 如果不存在，创建新的 Sprite
        if (!agent) {
            agent = new Agent(this, state.x, state.y, state.texture);
            this.agents.set(id, agent);
        }

        // 确保 agent 处于激活状态
        if (agent && agent.active) {
            // 同步移动逻辑
            if (state.targetPosition) {
                const currentTargetX = agent.targetX;
                const currentTargetY = agent.targetY;
                const newTargetX = state.targetPosition.x;
                const newTargetY = state.targetPosition.y;

                if (currentTargetX == null || currentTargetY == null ||
                    Phaser.Math.Distance.Between(currentTargetX, currentTargetY, newTargetX, newTargetY) > 1) {
                    agent.moveTo(newTargetX, newTargetY);
                }
            }
            // 同步状态消息
            if (state.status && state.message) {
                agent.say(state.message, 3000);
            }
        }
    }
  }

  update() {
    // 恢复使用 preUpdate，这里不需要手动调用 update
  }

  createDesk(x: number, y: number) {
    console.log('Creating desk at', x, y);
    // 使用单帧桌子
    // const desk = this.add.sprite(x, y, 'desk', 0); // 强制只显示第 0 帧
    // desk.setScale(1); 
    
    // 确保 Y-Sorting 能正确获取到 desk 的 y 坐标
    // desk.setDepth(y);

    // 假设桌子尺寸为 138x107，锚点默认是中心 (0.5, 0.5)
    // 左上角坐标: x - 69, y - 53
    if (this.pathfindingManager) {
        this.pathfindingManager.addObstacle(x - 69, y - 53, 138, 107);
        // 绘制调试网格
        // this.pathfindingManager.drawDebug();
    }
  }
}
