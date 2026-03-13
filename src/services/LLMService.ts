// import axios from 'axios';

// DeepSeek API removed as per request
// const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
// const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMService {
  private static instance: LLMService;

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  // Mock chat method
  async chat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
    console.log('LLM Service is in MOCK mode (DeepSeek disabled).');
    return '天机暂闭，此乃模拟回复。';
  }

  // Mock plan generation
  async generatePlan(decreeContent: string): Promise<string[]> {
    console.log(`Generating mock plan for: ${decreeContent}`);
    
    // Simple keyword matching for better mock experience
    if (decreeContent.includes('部署') || decreeContent.includes('上线')) {
      return ['检查代码仓库', '构建前端资源', '备份数据库', '上传服务器', '重启服务', '验证健康状态'];
    }
    if (decreeContent.includes('测试') || decreeContent.includes('bug')) {
      return ['重现问题', '分析日志', '编写修复方案', '单元测试', '集成测试', '提交修复'];
    }
    if (decreeContent.includes('设计') || decreeContent.includes('UI')) {
      return ['收集需求', '绘制草图', '制作高保真原型', '交互评审', '切图交付'];
    }

    // Default generic plan
    return [
      `分析${decreeContent}的可行性`,
      '召集各部商议细节',
      '草拟具体实施方案',
      '分配资源与人力',
      '开始执行任务',
      '验收与汇报'
    ];
  }

  // Mock plan critique
  async critiquePlan(decreeContent: string, plan: string[]): Promise<{ approved: boolean; reason: string }> {
    console.log(`Critiquing plan for: ${decreeContent}`);
    
    // 80% chance of approval
    const isApproved = Math.random() > 0.2;
    
    if (isApproved) {
      return { 
        approved: true, 
        reason: '方案详实，风险可控，准奏。' 
      };
    } else {
      return { 
        approved: false, 
        reason: '步骤略显草率，缺乏应急预案，请再议。' 
      };
    }
  }
}
