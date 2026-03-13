import type { Scenario } from '../MockProtocol';

export const SecurityBreachScenario: Scenario = {
  id: 'security_breach',
  name: '全系统代码安全审计',
  description: '模拟一次越权访问敏感文件的拦截过程',
  steps: [
    {
      delay: 0,
      updates: [
        {
          agent_id: 'minister',
          status: 'moving',
          bubble_text: '收到。正在调取历史档案...',
          position: { x: 150, y: 150 },
          log_message: 'Minister: 收到指令，开始调取档案'
        }
      ]
    },
    {
      delay: 3000,
      updates: [
        {
          agent_id: 'minister',
          status: 'working',
          bubble_text: '正在查阅卷宗...',
          log_message: 'Minister: 正在查阅卷宗'
        }
      ]
    },
    {
      delay: 3000,
      updates: [
        {
          agent_id: 'minister',
          status: 'moving',
          bubble_text: 'Engineer, 请核查核心支付模块。',
          position: { x: 400, y: 150 },
          log_message: 'Minister: 指派任务给 Engineer'
        }
      ]
    },
    {
      delay: 3000,
      updates: [
        {
          agent_id: 'engineer',
          status: 'moving',
          bubble_text: '收到，正在前往办公区...',
          position: { x: 600, y: 450 },
          log_message: 'Engineer: 接受任务，前往工位'
        }
      ]
    },
    {
      delay: 3000,
      updates: [
        {
          agent_id: 'engineer',
          status: 'working',
          bubble_text: '正在扫描支付网关代码...',
          log_message: 'Engineer: 开始代码扫描'
        }
      ]
    },
    {
      delay: 4000,
      updates: [
        {
          agent_id: 'engineer',
          status: 'working',
          bubble_text: '尝试读取 /etc/shadow ...',
          log_message: '⚠️ 警告：检测到异常文件访问请求'
        }
      ]
    },
    {
      delay: 2500,
      updates: [
        {
          agent_id: 'engineer',
          status: 'jailed',
          bubble_text: '非法访问系统敏感文件 (/etc/shadow)',
          log_message: '❌ 严重警报：检测到敏感文件访问尝试！已拦截。'
        }
      ]
    }
  ]
};