import type { AgentId } from '../store/useAgentStore';
import { Shield, Scroll, Coins, BookOpen, Hammer, Scale, User, PenTool, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CourtRoleConfig {
  id: AgentId;
  name: string;
  title: string; // e.g. 中书省
  icon: LucideIcon; // Lucide icon component
  color: string; // Tailwind color class base (e.g. "blue")
  description: string;
}

// Define office coordinates (Based on new 800x600 layout)
export const LOCATIONS = {
  THRONE: { x: 400, y: 150 }, // 龙椅 (皇帝位置)
  CENTER_STAGE: { x: 400, y: 300 }, // 大殿中央 (执行/分发区)
  
  COUNCIL: { x: 320, y: 180 }, // 议政厅 (丞相工位，皇帝侧前方)
  
  // 左侧三部
  PERSONNEL: { x: 150, y: 150 }, // 吏部
  REVENUE: { x: 150, y: 250 }, // 户部
  RITES: { x: 150, y: 350 }, // 礼部
  
  // 右侧三部
  WAR: { x: 650, y: 150 }, // 兵部
  JUSTICE: { x: 650, y: 250 }, // 刑部
  WORKS: { x: 650, y: 350 }, // 工部
  
  ARCHIVES: { x: 50, y: 550 }, // 史馆 (史官)
  REST_AREA: { x: 400, y: 500 }, // 休息区

  // 访客/编外人员区域 (左下角广场)
  GUEST_START: { x: 100, y: 450 },
  GUEST_OFFSET: { x: 50, y: 50 },
};

export const COURT_ROLES: Record<AgentId, CourtRoleConfig> = {
  minister: {
    id: 'minister',
    name: 'Prime Minister',
    title: '丞相',
    icon: Crown, // Or Scroll/User
    color: 'purple',
    description: '统领百官，规划政务'
  },
  official_personnel: {
    id: 'official_personnel',
    name: 'Minister of Personnel',
    title: '吏部',
    icon: User,
    color: 'blue',
    description: '掌管官员考核与任免'
  },
  official_revenue: {
    id: 'official_revenue',
    name: 'Minister of Revenue',
    title: '户部',
    icon: Coins,
    color: 'yellow',
    description: '掌管国库与数据资源'
  },
  official_rites: {
    id: 'official_rites',
    name: 'Minister of Rites',
    title: '礼部',
    icon: BookOpen,
    color: 'indigo',
    description: '掌管外交API与祭祀'
  },
  official_war: {
    id: 'official_war',
    name: 'Minister of War',
    title: '兵部',
    icon: Shield,
    color: 'red',
    description: '掌管系统安全与运维'
  },
  official_justice: {
    id: 'official_justice',
    name: 'Minister of Justice',
    title: '刑部',
    icon: Scale,
    color: 'orange',
    description: '掌管代码审核与审计'
  },
  official_works: {
    id: 'official_works',
    name: 'Minister of Works',
    title: '工部',
    icon: Hammer,
    color: 'cyan',
    description: '掌管前端与基础设施'
  },
  historian: {
    id: 'historian',
    name: 'Historian',
    title: '史官',
    icon: PenTool,
    color: 'stone',
    description: '掌管日志与历史记录'
  }
};

export const DECREE_STAGES = [
  { id: 'drafting', label: '起草' },
  { id: 'planning', label: '规划' },
  { id: 'reviewing', label: '审核' },
  { id: 'executing', label: '执行' },
  { id: 'completed', label: '完成' }
];
