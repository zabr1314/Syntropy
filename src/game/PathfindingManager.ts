import Phaser from 'phaser';
import EasyStar from 'easystarjs';

export class PathfindingManager {
  private easyStar: EasyStar.js;
  private tileSize: number;
  private grid: number[][] = [];
  private scene: Phaser.Scene;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor(scene: Phaser.Scene, tileSize: number = 32) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.easyStar = new EasyStar.js();
    this.easyStar.enableDiagonals(); // 允许对角线移动
    this.easyStar.disableCornerCutting(); // 禁止穿角
  }

  public initGrid(width: number, height: number) {
    this.width = width;
    this.height = height;
    const cols = Math.ceil(width / this.tileSize);
    const rows = Math.ceil(height / this.tileSize);

    // 初始化全 0 网格 (可行走)
    this.grid = [];
    for (let y = 0; y < rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < cols; x++) {
        row.push(0);
      }
      this.grid.push(row);
    }

    this.easyStar.setGrid(this.grid);
    this.easyStar.setAcceptableTiles([0]); // 0 是可行走区域
  }

  public addObstacle(x: number, y: number, width: number, height: number) {
    // 将世界坐标转换为网格范围
    const startCol = Math.floor(x / this.tileSize);
    const startRow = Math.floor(y / this.tileSize);
    const endCol = Math.ceil((x + width) / this.tileSize);
    const endRow = Math.ceil((y + height) / this.tileSize);

    const cols = this.grid[0].length;
    const rows = this.grid.length;

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          this.grid[r][c] = 1; // 1 是障碍物
        }
      }
    }
    
    // 更新网格
    this.easyStar.setGrid(this.grid);
  }

  public findPath(startX: number, startY: number, endX: number, endY: number): Promise<{x: number, y: number}[]> {
    return new Promise((resolve) => {
      const startGridX = Math.floor(startX / this.tileSize);
      const startGridY = Math.floor(startY / this.tileSize);
      const endGridX = Math.floor(endX / this.tileSize);
      const endGridY = Math.floor(endY / this.tileSize);

      // 边界检查
      if (!this.isValidGrid(startGridX, startGridY) || !this.isValidGrid(endGridX, endGridY)) {
        console.warn('Path start or end point is out of bounds');
        resolve([]);
        return;
      }

      this.easyStar.findPath(startGridX, startGridY, endGridX, endGridY, (path) => {
        if (path === null) {
          console.warn('Path was not found.');
          resolve([]);
        } else {
          // 将网格坐标转换为世界坐标 (中心点)
          const worldPath = path.map(p => ({
            x: p.x * this.tileSize + this.tileSize / 2,
            y: p.y * this.tileSize + this.tileSize / 2
          }));
          resolve(worldPath);
        }
      });
      
      this.easyStar.calculate();
    });
  }

  private isValidGrid(x: number, y: number): boolean {
    return x >= 0 && x < this.grid[0].length && y >= 0 && y < this.grid.length;
  }

  public drawDebug() {
    if (this.debugGraphics) {
      this.debugGraphics.clear();
    } else {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(999999);
    }

    const cols = this.grid[0].length;
    const rows = this.grid.length;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (this.grid[y][x] === 1) {
          this.debugGraphics.fillStyle(0xff0000, 0.3); // 红色半透明表示障碍物
          this.debugGraphics.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        } else {
            // this.debugGraphics.lineStyle(1, 0xffffff, 0.1); // 白色网格线
            // this.debugGraphics.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
  }
}
