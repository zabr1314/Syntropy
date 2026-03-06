import Phaser from 'phaser';

export default class SpeechBubble extends Phaser.GameObjects.Container {
  private bubble: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bubble = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'ArkPixel, monospace',
      fontSize: '12px',
      color: '#000000',
      align: 'center',
      wordWrap: { width: 100 }
    });
    this.text.setResolution(2); // 提高清晰度

    this.add(this.bubble);
    this.add(this.text);

    // 初始隐藏
    this.setVisible(false);
    this.setDepth(100); // 确保在最上层
    
    scene.add.existing(this);
  }

  show(message: string, duration: number = 2000) {
    // 检查组件是否活跃
    if (!this.scene || !this.scene.sys || !this.scene.sys.isActive() || !this.active) {
        return;
    }

    // 如果有之前的定时器，先清除
    if (this.timer) {
      this.timer.remove();
    }

    this.text.setText(message);
    const bounds = this.text.getBounds();
    const padding = 8;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    this.bubble.clear();
    
    // 像素风格气泡：白色背景，黑色边框
    this.bubble.fillStyle(0xffffff, 1);
    this.bubble.lineStyle(2, 0x000000, 1);
    
    // 矩形主体 (sharp corners)
    this.bubble.fillRect(-width / 2, -height - 10, width, height);
    this.bubble.strokeRect(-width / 2, -height - 10, width, height);
    
    // 气泡尖角 (简单的三角形)
    this.bubble.fillTriangle(
      0, -10,
      -6, -10,
      0, 0
    );
    this.bubble.strokeTriangle(
      0, -10,
      -6, -10,
      0, 0
    );
    // 重新填充以覆盖接缝
    this.bubble.fillStyle(0xffffff, 1);
    this.bubble.fillTriangle(
      -1, -10,
      -5, -10,
      0, -2
    );

    // 调整文字位置
    this.text.setPosition(-width / 2 + padding, -height - 10 + padding);
    
    this.setVisible(true);
    this.setAlpha(1);

    // 自动消失
    this.timer = this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.setVisible(false);
        }
      });
    });
  }
}
