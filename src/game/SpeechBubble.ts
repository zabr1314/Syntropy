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

  /**
   * stream() — for live streaming updates.
   * Immediately renders the current buffer text without typewriter effect.
   * Does NOT reset the bubble or restart timers on every chunk.
   */
  stream(message: string) {
    if (!this.scene || !this.scene.sys || !this.scene.sys.isActive() || !this.active) return;

    // Stop any typewriter in progress
    if (this.typingTimer) {
      this.typingTimer.remove();
      this.typingTimer = undefined;
    }
    // Stop any fade-out
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.setVisible(true);

    this.renderBubble(message);
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

    this.renderBubble(message);

    // 打字机效果
    let currentChar = 0;
    this.typingTimer = this.scene.time.addEvent({
        delay: 50,
        repeat: message.length,
        callback: () => {
            if (this.text && this.text.active) {
                this.text.setText(message.substring(0, currentChar));
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

  private renderBubble(message: string) {
    const padding = 8;
    // Truncate for display — keep bubble readable
    const display = message.length > 60 ? '...' + message.slice(-60) : message;

    const tempText = this.scene.add.text(0, 0, display, this.text.style);
    const bounds = tempText.getBounds();
    tempText.destroy();

    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    this.bubble.clear();
    this.bubble.fillStyle(0xffffff, 1);
    this.bubble.lineStyle(2, 0x000000, 1);
    this.bubble.fillRect(-width / 2, -height - 10, width, height);
    this.bubble.strokeRect(-width / 2, -height - 10, width, height);
    this.bubble.fillTriangle(0, -10, -6, -10, 0, 0);
    this.bubble.strokeTriangle(0, -10, -6, -10, 0, 0);
    this.bubble.fillStyle(0xffffff, 1);
    this.bubble.fillTriangle(-1, -10, -5, -10, 0, -2);

    this.text.setPosition(-width / 2 + padding, -height - 10 + padding);
    this.text.setText(display);
  }
}
