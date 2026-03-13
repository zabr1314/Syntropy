import Phaser from 'phaser';

export default class SpeechBubble extends Phaser.GameObjects.Container {
  private bubble: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private timer?: Phaser.Time.TimerEvent;
  private typingTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bubble = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'ArkPixel, monospace',
      fontSize: '12px',
      color: '#000000',
      align: 'center',
      wordWrap: { width: 180 }
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

    // 如果有之前的自动消失定时器，先清除
    if (this.timer) {
      this.timer.remove();
      this.timer = undefined;
    }

    // 如果有之前的打字机定时器，先清除
    if (this.typingTimer) {
      this.typingTimer.remove();
      this.typingTimer = undefined;
    }
    
    // 停止之前的淡出动画
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.setVisible(true);
    
    // 初始化文字为空
    this.text.setText('');
    this.text.setVisible(true);
    
    // 预先计算最终尺寸 (为了气泡大小正确)
    const tempText = this.scene.add.text(0, 0, message, this.text.style);
    const bounds = tempText.getBounds();
    tempText.destroy();
    
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
    this.bubble.fillTriangle(0, -10, -6, -10, 0, 0);
    this.bubble.strokeTriangle(0, -10, -6, -10, 0, 0);
    // 重新填充以覆盖接缝
    this.bubble.fillStyle(0xffffff, 1);
    this.bubble.fillTriangle(-1, -10, -5, -10, 0, -2);

    // 调整文字位置
    this.text.setPosition(-width / 2 + padding, -height - 10 + padding);
    
    // 打字机效果
    let currentChar = 0;
    // 使用简单的定时器而不是 addEvent，更容易控制
    this.typingTimer = this.scene.time.addEvent({
        delay: 50, // 打字速度
        repeat: message.length, // 多跑一次以确保完整显示
        callback: () => {
            if (this.text && this.text.active) {
                // 使用 setText 覆盖而不是 += 追加，防止并发重叠
                const currentText = message.substring(0, currentChar);
                this.text.setText(currentText);
                currentChar++;
            }
        }
    });

    // 自动消失 (加上打字时间)
    const totalDuration = duration + message.length * 50;
    this.timer = this.scene.time.delayedCall(totalDuration, () => {
      if (this.scene) {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
            this.setVisible(false);
            this.text.setText('');
            }
        });
      }
    });
  }
}
