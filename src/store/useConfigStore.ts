/*
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-09 09:41:25
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-09 16:23:23
 * @FilePath: /天命系统/src/store/useConfigStore.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// import type { Official } from '../types/api'; // Not used anymore

export interface AgentConfig {
  role: string;
  name: string;
  port: string;
  skills?: string[];
  mcpServers?: string[];
  description?: string;
  systemPrompt?: string; // Added for prompt editing
  model?: string | object; // Added for model config
  texture?: string; // Added for visual customization
}

export interface SkillDefinition {
    name: string;
    description: string;
    riskLevel: string;
}

export interface AgentFile {
    name: string;
    size: number;
    createdAt: string;
}

export interface ConfigState {
  agents: AgentConfig[];
  skills: SkillDefinition[]; // Available global skills
  relayUrl: string;
  
  // Model Keys
  deepseekKey: string;
  openaiKey: string;
  setDeepseekKey: (key: string) => void;
  setOpenaiKey: (key: string) => void;
  
  // Legacy fields (optional)
  apiEndpoints?: string[];
  
  fetchOfficials: () => Promise<void>;
  fetchSkills: () => Promise<void>;
  addAgent: (config: AgentConfig) => Promise<void>;
  updateAgent: (role: string, updates: Partial<AgentConfig>) => Promise<void>;
  removeAgent: (role: string) => Promise<void>;
  getAgentConfig: (role: string) => AgentConfig | undefined;
  
  // File Management
  fetchFiles: (agentId: string) => Promise<AgentFile[]>;
  uploadFile: (agentId: string, file: File) => Promise<void>;
  deleteFile: (agentId: string, filename: string) => Promise<void>;

  // Legacy
  addEndpoint: (url: string) => void;
  removeEndpoint: (url: string) => void;
  resetEndpoints: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      agents: [
        {
            role: 'emperor',
            name: 'Emperor',
            port: '3001',
            description: 'The ruler of the court',
            systemPrompt: 'You are the Emperor...',
            model: 'deepseek-chat',
            texture: 'emperor'
        }
      ], 
      skills: [],
      relayUrl: 'http://localhost:3001',
      deepseekKey: '',
      openaiKey: '',
      apiEndpoints: [],
      
      setDeepseekKey: (key: string) => set({ deepseekKey: key }),
      setOpenaiKey: (key: string) => set({ openaiKey: key }),

      fetchOfficials: async () => {
        try {
            const url = get().relayUrl || 'http://localhost:3001';
            const response = await fetch(`${url}/api/officials`);
            if (!response.ok) throw new Error('Failed to fetch officials');
            const officials = await response.json();
            
            const agents = officials.map((o: { id: string, name: string, description: string, systemPrompt?: string, skills?: string[], model?: string|object, texture?: string }) => ({
                role: o.id,
                name: o.name,
                port: '3001',
                description: o.description,
                systemPrompt: o.systemPrompt,
                skills: o.skills,
                model: o.model,
                texture: o.texture
            }));
            
            // Merge with local state to preserve un-synced changes or textures if backend missing
            set((state) => {
                const mergedAgents = agents.map((remote: AgentConfig) => {
                    const local = state.agents.find(a => a.role === remote.role);
                    return {
                        ...remote,
                        texture: remote.texture || local?.texture // Fallback to local texture if remote is missing
                    };
                });
                return { agents: mergedAgents };
            });
        } catch (error) {
            console.error('Fetch Officials Error:', error);
        }
      },


      fetchSkills: async () => {
          try {
              const url = get().relayUrl || 'http://localhost:3001';
              const response = await fetch(`${url}/api/skills`);
              if (!response.ok) throw new Error('Failed to fetch skills');
              const skills = await response.json();
              set({ skills });
          } catch (error) {
              console.error('Fetch Skills Error:', error);
          }
      },
      
      addAgent: async (config: AgentConfig) => {
          // Optimistic update to prevent race condition with socket events
          set((state) => ({ agents: [...state.agents, config] }));
          
          try {
              const url = get().relayUrl || 'http://localhost:3001';
              await fetch(`${url}/api/agents`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      id: config.role,
                      name: config.name,
                      description: config.description,
                      systemPrompt: config.systemPrompt,
                      skills: config.skills,
                      mcpServers: config.mcpServers,
                      model: config.model,
                      texture: config.texture
                  })
              });
              // Don't fetch immediately to avoid overwriting optimistic update if backend is slow
              // Wait for socket update or next poll
              // await get().fetchOfficials(); 
          } catch (error) {
              console.error('Create Agent Error:', error);
              // Revert optimistic update on error
              set((state) => ({ agents: state.agents.filter(a => a.role !== config.role) }));
          }
      },
      
      updateAgent: async (role: string, updates: Partial<AgentConfig>) => {
          // Optimistic update
          set((state) => ({
            agents: state.agents.map(agent => 
                agent.role === role ? { ...agent, ...updates } : agent
            )
          }));

          // Sync with backend
          try {
              const url = get().relayUrl || 'http://localhost:3001';
              const payload: Record<string, unknown> = {};
              
              if (updates.systemPrompt) payload.systemPrompt = updates.systemPrompt;
              if (updates.skills) payload.skills = updates.skills;
              if (updates.model) payload.model = updates.model;
              
              await fetch(`${url}/api/agents/${role}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });
          } catch (error) {
              console.error('Update Agent Error:', error);
          }
      },

      removeAgent: async (role: string) => {
          // Optimistic update
          set((state) => ({
              agents: state.agents.filter(a => a.role !== role)
          }));

          // Also remove from AgentStore (live state)
          const { removeAgent: removeLiveAgent } = await import('./useAgentStore').then(m => m.useAgentStore.getState());
          removeLiveAgent(role);

          try {
              const url = get().relayUrl || 'http://localhost:3001';
              await fetch(`${url}/api/agents/${role}`, {
                  method: 'DELETE'
              });
              // Don't fetch immediately to avoid overwriting optimistic update if backend is slow
              // await get().fetchOfficials();
          } catch (error) {
              console.error('Delete Agent Error:', error);
              // Since we don't have the original agent config easily, we might need to fetch
              await get().fetchOfficials();
          }
      },
      
      getAgentConfig: (role: string) => get().agents.find(a => a.role === role),
      
      // File Management
      fetchFiles: async (agentId: string) => {
          try {
              const url = get().relayUrl || 'http://localhost:3001';
              const response = await fetch(`${url}/api/agents/${agentId}/files`);
              if (!response.ok) throw new Error('Failed to fetch files');
              return await response.json();
          } catch (error) {
              console.error('Fetch Files Error:', error);
              return [];
          }
      },

      uploadFile: async (agentId: string, file: File) => {
          try {
              const url = get().relayUrl || 'http://localhost:3001';
              const formData = new FormData();
              formData.append('file', file);
              
              const response = await fetch(`${url}/api/agents/${agentId}/files`, {
                  method: 'POST',
                  body: formData
              });
              
              if (!response.ok) throw new Error('Failed to upload file');
          } catch (error) {
              console.error('Upload File Error:', error);
              throw error;
          }
      },

      deleteFile: async (agentId: string, filename: string) => {
          try {
              const url = get().relayUrl || 'http://localhost:3001';
              const response = await fetch(`${url}/api/agents/${agentId}/files/${filename}`, {
                  method: 'DELETE'
              });
              
              if (!response.ok) throw new Error('Failed to delete file');
          } catch (error) {
              console.error('Delete File Error:', error);
              throw error;
          }
      },

      // Stub implementations for legacy support
      addEndpoint: (url: string) => set((state) => ({ apiEndpoints: [...(state.apiEndpoints || []), url] })),
      removeEndpoint: (url: string) => set((state) => ({ apiEndpoints: (state.apiEndpoints || []).filter(u => u !== url) })),
      resetEndpoints: () => set({ apiEndpoints: [] })
    }),
    {
      name: 'agent-config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        agents: state.agents,
        skills: state.skills,
        relayUrl: state.relayUrl,
        apiEndpoints: state.apiEndpoints,
        deepseekKey: state.deepseekKey,
        openaiKey: state.openaiKey
      })
    }
  )
);
