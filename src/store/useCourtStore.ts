import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DecreeStatus = 'drafting' | 'planning' | 'reviewing' | 'approved' | 'rejected' | 'executing' | 'completed' | 'paused' | 'cancelled';

export interface DecisionNode {
  id: string;                    // 节点ID
  agentId: string;               // 执行者（minister/revenue/...）
  action: string;                // "调度户部" / "执行财务分析"
  reasoning: string;             // "用户问题涉及财务统计"
  timestamp: number;

  // 决策依据
  alternatives?: string[];       // ["works", "justice"]
  whyNot?: string;               // "工部偏工程，刑部偏合规"
  evidenceMemoryIds?: string[];  // ["mem_abc", "mem_def"]
  confidence?: number;           // 0-100

  // 执行结果
  output?: string;               // 该节点的实际输出
  outputSummary?: string;        // 输出摘要（前200字）
  tokenUsed?: number;
  durationMs?: number;

  // 树结构
  children?: DecisionNode[];     // 子决策
  parentId?: string;
}

export interface Decree {
  id: string;
  title: string;
  content: string;
  status: DecreeStatus;
  plan: string[];
  feedback?: string;
  chancelleryOpinion?: {
    approved: boolean;
    reason: string;
  };
  assignedTo?: string; // agentId
  assignedMinistry?: string;
  previousStatus?: DecreeStatus;
  logs: DecreeLog[];
  decisionTree?: DecisionNode;   // 决策树根节点
}

export interface DecreeLog {
  timestamp: number;
  actor: string;
  action: string;
  details?: string;
}

export interface CourtState {
  decrees: Decree[];
  activeDecreeId: string | null;

  // Actions
  addDecree: (content: string) => string;
  updateDecreeStatus: (id: string, status: DecreeStatus, feedback?: string) => void;
  updateDecreePlan: (id: string, plan: string[]) => void;
  setChancelleryOpinion: (id: string, opinion: { approved: boolean; reason: string }) => void;
  assignDecree: (id: string, agentId: string, ministry?: string) => void;
  addLog: (id: string, actor: string, action: string, details?: string) => void;
  appendLogContent: (id: string, content: string) => void;
  setActiveDecree: (id: string | null) => void;
  pauseDecree: (id: string) => void;
  resumeDecree: (id: string) => void;
  cancelDecree: (id: string) => void;
  clearCompletedDecrees: () => void;
  getDecree: (id: string) => Decree | undefined;
  addDecisionNode: (decreeId: string, node: DecisionNode) => void;
  updateDecisionOutput: (decreeId: string, nodeId: string, output: string, outputSummary: string, durationMs: number) => void;

  // Input State
  draftInput: string;
  setDraftInput: (input: string) => void;
}

export const useCourtStore = create<CourtState>()(
  persist(
    (set, get) => ({
      decrees: [],
      activeDecreeId: null,
      draftInput: '',

      addDecree: (content) => {
        const id = Date.now().toString();
        const newDecree: Decree = {
          id,
          title: content.substring(0, 15) + (content.length > 15 ? '...' : ''),
          content,
          status: 'drafting',
          plan: [],
          logs: [{
            timestamp: Date.now(),
            actor: 'Emperor',
            action: '发布诏令',
            details: content
          }]
        };
        
        set((state) => ({
          decrees: [...state.decrees, newDecree],
          activeDecreeId: id
        }));
        
        return id;
      },

      updateDecreeStatus: (id, status, feedback) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id ? { ...d, status, feedback } : d
          )
        }));
      },

      updateDecreePlan: (id, plan) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id ? { ...d, plan } : d
          )
        }));
      },

      setChancelleryOpinion: (id, opinion) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id ? { ...d, chancelleryOpinion: opinion } : d
          )
        }));
      },

      assignDecree: (id, agentId, ministry) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id ? { ...d, assignedTo: agentId, assignedMinistry: ministry } : d
          )
        }));
      },

      addLog: (id, actor, action, details) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id ? {
              ...d,
              logs: [...d.logs, {
                timestamp: Date.now(),
                actor,
                action,
                details
              }]
            } : d
          )
        }));
      },

      appendLogContent: (id, content) => {
        set((state) => ({
          decrees: state.decrees.map(d => {
            if (d.id !== id) return d;
            
            const logs = [...d.logs];
            if (logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                logs[logs.length - 1] = {
                    ...lastLog,
                    details: (lastLog.details || '') + content,
                    timestamp: Date.now() // Update timestamp to keep it fresh
                };
            }
            return { ...d, logs };
          })
        }));
      },

      setActiveDecree: (id) => set({ activeDecreeId: id }),
      
      pauseDecree: (id) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id && d.status !== 'paused' && d.status !== 'completed' && d.status !== 'cancelled' ? {
              ...d,
              status: 'paused',
              previousStatus: d.status,
              logs: [...d.logs, {
                timestamp: Date.now(),
                actor: 'System',
                action: '暂停任务',
                details: '用户暂停'
              }]
            } : d
          )
        }));
      },

      resumeDecree: (id) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id && d.status === 'paused' && d.previousStatus ? {
              ...d,
              status: d.previousStatus,
              previousStatus: undefined,
              logs: [...d.logs, {
                timestamp: Date.now(),
                actor: 'System',
                action: '恢复任务',
                details: '用户恢复'
              }]
            } : d
          )
        }));
      },

      cancelDecree: (id) => {
        set((state) => ({
          decrees: state.decrees.map(d => 
            d.id === id ? {
              ...d,
              status: 'cancelled',
              logs: [...d.logs, {
                timestamp: Date.now(),
                actor: 'System',
                action: '取消任务',
                details: '用户取消'
              }]
            } : d
          )
        }));
      },

      clearCompletedDecrees: () => {
        set((state) => ({
          decrees: state.decrees.filter(d => 
            d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'rejected'
          ),
          activeDecreeId: state.activeDecreeId 
            ? (state.decrees.find(d => d.id === state.activeDecreeId && (d.status === 'completed' || d.status === 'cancelled' || d.status === 'rejected')) ? null : state.activeDecreeId)
            : null
        }));
      },

      setDraftInput: (input) => set({ draftInput: input }),

      getDecree: (id) => get().decrees.find(d => d.id === id),

      addDecisionNode: (decreeId, node) => {
        set((state) => ({
          decrees: state.decrees.map(d => {
            if (d.id !== decreeId) return d;
            if (!d.decisionTree) {
              // node is already the root (with children pre-attached)
              return { ...d, decisionTree: node };
            }
            // root exists — append node as child of root
            const root = { ...d.decisionTree };
            root.children = [...(root.children || []), { ...node, children: node.children || [] }];
            return { ...d, decisionTree: root };
          })
        }));
      },

      updateDecisionOutput: (decreeId, nodeId, output, outputSummary, durationMs) => {
        set((state) => ({
          decrees: state.decrees.map(d => {
            if (d.id !== decreeId || !d.decisionTree) return d;
            const updateNode = (node: DecisionNode): DecisionNode => {
              if (node.id === nodeId) {
                return { ...node, output, outputSummary, durationMs };
              }
              return { ...node, children: node.children?.map(updateNode) };
            };
            return { ...d, decisionTree: updateNode(d.decisionTree) };
          })
        }));
      }
    }),
    {
      name: 'court-storage', // unique name
      storage: createJSONStorage(() => localStorage), // use localStorage
    }
  )
);
