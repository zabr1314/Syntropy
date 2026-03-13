export class MessageProcessor {
    private agentMessageBuffers: Record<string, { text: string, time: number }> = {};

    public processMessage(agentId: string, status: string, message?: string): string | undefined {
        let fullMessageForBubble = message;

        if (message && status === 'working' && this.isValidMessage(message)) {
            const now = Date.now();
            const buffer = this.agentMessageBuffers[agentId];

            if (buffer && (now - buffer.time < 2000)) {
                // Append to buffer
                buffer.text += message;
                buffer.time = now;

                // 气泡截断逻辑
                if (buffer.text.length > 50) {
                    fullMessageForBubble = "..." + buffer.text.slice(-50);
                } else {
                    fullMessageForBubble = buffer.text;
                }
            } else {
                // New buffer
                this.agentMessageBuffers[agentId] = { text: message, time: now };
                fullMessageForBubble = message;
            }
        } else {
            // Clear buffer if status changed or message is invalid
            if (status !== 'working') {
                delete this.agentMessageBuffers[agentId];
            }
        }

        return fullMessageForBubble;
    }

    private isValidMessage(message: string): boolean {
        return message !== '正在思考...' && 
               message !== '执行中...' && 
               message !== '等待指令...' &&
               message !== '使用工具...' &&
               message !== '已离线';
    }
}