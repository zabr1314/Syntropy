import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore, type AgentSkill, type AgentFile } from '../../store/useConfigStore'; // Updated imports
import { COURT_ROLES } from '../../constants/court';
import type { AgentId } from '../../store/useAgentStore';
import { X, Save, Server, Cpu, Plug, Box, Trash2, Plus, FileText, Upload, Folder } from 'lucide-react'; // Added icons
import clsx from 'clsx';

interface AgentDetailModalProps {
  role: AgentId;
  onClose: () => void;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ role, onClose }) => {
  const { getAgentConfig, updateAgent, fetchSkills, skills: availableSkills, fetchFiles, uploadFile, deleteFile } = useConfigStore();
  const config = getAgentConfig(role);
  // Fallback for role info if not found in COURT_ROLES
  const roleInfo = COURT_ROLES[role] || {
    id: role,
    title: config?.name || role,
    description: config?.description || 'Custom Agent',
    icon: Box, // Default icon
    color: 'gray'
  };

  // Ensure roleInfo.icon exists, fallback to Box if somehow undefined
  const RoleIcon = roleInfo.icon || Box;

  // Tabs state
  const [activeTab, setActiveTab] = useState<'config' | 'files'>('config');

  // Local state for editing
  const [port, setPort] = useState(config?.port || '');
  const [skills, setSkills] = useState<string[]>(config?.skills || []);
  const [systemPrompt, setSystemPrompt] = useState(config?.systemPrompt || '');
  const [model, setModel] = useState(typeof config?.model === 'string' ? config.model : (config?.model as any)?.primary || 'deepseek-chat');
  
  // Files state
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (config) {
        setPort(config.port);
        setSkills(config.skills || []);
        setSystemPrompt(config.systemPrompt || '');
        setModel(typeof config.model === 'string' ? config.model : (config.model as any)?.primary || 'deepseek-chat');
        loadFiles();
    }
  }, [config]);

  const loadFiles = async () => {
      if (config) {
          const fileList = await fetchFiles(config.role);
          setFiles(fileList);
      }
  };

  if (!config) return null;

  const handleSave = () => {
    updateAgent(role, {
        port,
        skills,
        systemPrompt,
        model: { primary: model }
    });
    onClose();
  };

  const toggleSkill = (skillName: string) => {
      setSkills(prev => {
          if (prev.includes(skillName)) {
              return prev.filter(s => s !== skillName);
          } else {
              return [...prev, skillName];
          }
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          try {
              await uploadFile(role, e.target.files[0]);
              await loadFiles();
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleDeleteFile = async (filename: string) => {
      if (window.confirm(`Delete ${filename}?`)) {
          await deleteFile(role, filename);
          await loadFiles();
      }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 lg:p-12">
      {/* Overlay to catch clicks outside */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-6xl h-full max-h-[90vh] bg-[#1a0f0f] border border-[#8d6e63] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative z-10"
      >
        {/* Header */}
        <div className="h-20 bg-[#2c0b0e] border-b border-[#8d6e63]/50 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded bg-[#2c1810] border border-[#d4af37] flex items-center justify-center text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                    <RoleIcon size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[#e6d5ac] tracking-widest uppercase">{roleInfo.title}</h1>
                    <p className="text-sm text-[#8d6e63] font-mono tracking-wider">等级 1 • {roleInfo.description}</p>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-4">
                <button 
                    onClick={() => setActiveTab('config')}
                    className={clsx(
                        "px-4 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all",
                        activeTab === 'config' ? "bg-[#d4af37] text-black" : "text-[#8d6e63] hover:text-[#d4af37]"
                    )}
                >
                    配置 (Config)
                </button>
                <button 
                    onClick={() => setActiveTab('files')}
                    className={clsx(
                        "px-4 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all",
                        activeTab === 'files' ? "bg-[#d4af37] text-black" : "text-[#8d6e63] hover:text-[#d4af37]"
                    )}
                >
                    知识库 (Files)
                </button>
            </div>

            <div className="flex items-center gap-4">
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                >
                    <Save size={16} /> 保存
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 text-[#8d6e63] hover:text-white transition-colors"
                >
                    <X size={28} />
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* CONFIG TAB */}
            {activeTab === 'config' && (
                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    {/* Left: Configuration */}
                    <div className="w-full lg:w-1/2 p-8 border-r border-[#3e2723] overflow-y-auto custom-scrollbar flex flex-col gap-6">
                        <h3 className="text-[#d4af37] font-bold flex items-center gap-2">
                            <Server size={18} /> 核心配置
                        </h3>
                        
                        <div>
                            <label className="text-[10px] text-[#8d6e63] font-mono uppercase block mb-2">模型 (Model)</label>
                            <select 
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                className="w-full bg-black border border-[#3e2723] rounded p-3 text-[#e6d5ac] font-mono text-sm focus:border-[#d4af37] focus:outline-none appearance-none"
                            >
                                <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </select>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="text-[10px] text-[#8d6e63] font-mono uppercase block mb-2">系统提示词 (System Prompt)</label>
                            <textarea 
                                value={systemPrompt}
                                onChange={e => setSystemPrompt(e.target.value)}
                                className="flex-1 bg-black border border-[#3e2723] rounded p-4 text-[#e6d5ac] font-mono text-sm leading-relaxed focus:border-[#d4af37] focus:outline-none resize-none custom-scrollbar"
                                placeholder="You are a helpful assistant..."
                            />
                        </div>
                    </div>

                    {/* Right: Skills Selection */}
                    <div className="w-full lg:w-1/2 p-8 overflow-y-auto custom-scrollbar bg-black/20">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#d4af37] font-bold flex items-center gap-2">
                                <Box size={18} /> 技能配置 (Skills)
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {availableSkills.map(skill => {
                                const isEnabled = skills.includes(skill.name) || skills.includes('*');
                                const isGlobal = skills.includes('*');
                                
                                return (
                                    <div key={skill.name} 
                                        onClick={() => !isGlobal && toggleSkill(skill.name)}
                                        className={clsx(
                                        "border rounded p-3 flex items-center gap-3 transition-all cursor-pointer",
                                        isEnabled 
                                            ? "bg-[#2c1810] border-[#d4af37]/50" 
                                            : "bg-black border-[#3e2723] opacity-60 hover:opacity-80"
                                    )}>
                                        <div className="text-xl">📦</div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[#e6d5ac] font-bold text-sm">{skill.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "text-[10px] px-2 py-0.5 rounded border uppercase",
                                                        skill.riskLevel === 'high' ? "border-red-500 text-red-500" :
                                                        skill.riskLevel === 'medium' ? "border-yellow-500 text-yellow-500" :
                                                        "border-green-500 text-green-500"
                                                    )}>
                                                        {skill.riskLevel}
                                                    </span>
                                                    
                                                    <div className={clsx(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                        isEnabled ? "bg-[#d4af37] border-[#d4af37]" : "border-[#5d4037]"
                                                    )}>
                                                        {isEnabled && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[#8d6e63] text-xs mt-1 line-clamp-2">{skill.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            <div 
                                onClick={() => toggleSkill('*')}
                                className={clsx(
                                    "border border-dashed rounded p-3 flex items-center gap-3 transition-all cursor-pointer mt-4",
                                    skills.includes('*') 
                                        ? "bg-[#2c1810] border-[#d4af37]/50" 
                                        : "bg-black/30 border-[#3e2723]"
                                )}
                            >
                                <div className="text-xl">🌟</div>
                                <div className="flex-1">
                                    <h4 className="text-[#e6d5ac] font-bold text-sm">允许所有技能 (Allow All)</h4>
                                    <p className="text-[#8d6e63] text-xs mt-1">自动启用当前及未来添加的所有技能</p>
                                </div>
                                <div className={clsx(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    skills.includes('*') ? "bg-[#d4af37] border-[#d4af37]" : "border-[#5d4037]"
                                )}>
                                    {skills.includes('*') && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
                <div className="w-full p-8 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[#d4af37] font-bold flex items-center gap-2">
                            <Folder size={18} /> 工作区文件 (Workspace Files)
                        </h3>
                        <div className="relative">
                            <input 
                                type="file" 
                                id="file-upload" 
                                className="hidden" 
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                            <label 
                                htmlFor="file-upload"
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 bg-[#2c1810] border border-[#d4af37] text-[#d4af37] rounded cursor-pointer hover:bg-[#3e2723] transition-colors",
                                    isUploading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Upload size={16} />
                                {isUploading ? "Uploading..." : "Upload File"}
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 border border-[#3e2723] rounded p-4">
                        {files.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#5d4037]">
                                <Folder size={48} className="mb-4 opacity-50" />
                                <p>No files in workspace</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {files.map((file) => (
                                    <div key={file.name} className="bg-[#1a0f0f] border border-[#3e2723] p-4 rounded hover:border-[#d4af37]/50 transition-colors group relative">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-2 bg-[#2c1810] rounded text-[#d4af37]">
                                                <FileText size={24} />
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteFile(file.name)}
                                                className="text-[#5d4037] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <h4 className="text-[#e6d5ac] font-mono text-sm truncate mb-1" title={file.name}>{file.name}</h4>
                                        <div className="flex items-center justify-between text-[10px] text-[#8d6e63] font-mono">
                                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                                            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

      </motion.div>
    </div>
  );
};

export default AgentDetailModal;
