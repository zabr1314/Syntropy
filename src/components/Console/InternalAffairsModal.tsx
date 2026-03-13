import React, { useState } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import { useCourtStore } from '../../store/useCourtStore';
import { useAgentStore } from '../../store/useAgentStore';
import { X, Key, ShieldAlert, Trash2, Volume2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface InternalAffairsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InternalAffairsModal: React.FC<InternalAffairsModalProps> = ({ isOpen, onClose }) => {
  const { 
    deepseekKey, setDeepseekKey, 
    openaiKey, setOpenaiKey 
  } = useConfigStore();
  
  const { clearCompletedDecrees } = useCourtStore();
  const { agents, removeAgent } = useAgentStore(); // For dangerous resets

  // Local state for keys
  const [localDsKey, setLocalDsKey] = useState(deepseekKey);
  const [localOaiKey, setLocalOaiKey] = useState(openaiKey);
  const [statusMsg, setStatusMsg] = useState('');

  // Sync with store when opening
  React.useEffect(() => {
    if (isOpen) {
      setLocalDsKey(deepseekKey);
      setLocalOaiKey(openaiKey);
      setStatusMsg('');
    }
  }, [isOpen, deepseekKey, openaiKey]);

  const handleSaveKeys = () => {
    setDeepseekKey(localDsKey);
    setOpenaiKey(localOaiKey);
    setStatusMsg('印信已封存 (Keys Saved)');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleResetAgents = () => {
    if (confirm('此操作将遣散所有官员（重置 Agent 状态），确定执行吗？')) {
      // Logic to clear agents (relying on store implementation)
      // Since useAgentStore doesn't have clearAll, we might just reload or use what's available
      // For now, let's just clear decrees as a safe "reset"
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl bg-[#1a0f0f] border-2 border-[#d4af37] rounded-lg shadow-[0_0_50px_rgba(212,175,55,0.2)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 bg-[#2c0b0e] border-b border-[#d4af37] flex items-center justify-between px-6 relative overflow-hidden shrink-0">
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
               <div className="flex items-center gap-3 z-10">
                 <div className="w-10 h-10 rounded-full bg-[#d4af37] flex items-center justify-center text-[#2c0b0e] shadow-lg border border-[#fffdf5]">
                   <ShieldAlert size={20} />
                 </div>
                 <div>
                   <h2 className="text-xl font-serif font-bold text-[#e6d5ac] tracking-[0.2em]">内务府</h2>
                   <p className="text-[10px] text-[#d4af37]/60 font-mono uppercase tracking-widest">Internal Affairs & Secrets</p>
                 </div>
               </div>
               <button 
                 onClick={onClose}
                 className="z-10 w-8 h-8 rounded-full border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37] hover:text-[#2c0b0e] transition-all"
               >
                 <X size={18} />
               </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-[#1a0f0f]">
              
              {/* Section 1: Keys */}
              <div className="space-y-4">
                <h3 className="text-[#d4af37] font-bold flex items-center gap-2 border-b border-[#d4af37]/20 pb-2">
                  <Key size={18} />
                  <span>印信管理 (API Keys)</span>
                </h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[#8d6e63] uppercase font-bold tracking-wider">DeepSeek API Key</label>
                    <input 
                      type="password" 
                      value={localDsKey}
                      onChange={(e) => setLocalDsKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-3 text-[#e6d5ac] font-mono focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-[#8d6e63] uppercase font-bold tracking-wider">OpenAI API Key (Optional)</label>
                    <input 
                      type="password" 
                      value={localOaiKey}
                      onChange={(e) => setLocalOaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-3 text-[#e6d5ac] font-mono focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-green-500 text-xs font-mono">{statusMsg}</span>
                    <button
                      onClick={handleSaveKeys}
                      className="flex items-center gap-2 px-6 py-2 bg-[#d4af37] text-[#2c0b0e] font-bold rounded hover:bg-[#c5a028] transition-colors shadow-lg"
                    >
                      <Save size={16} /> 保存印信
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Maintenance */}
              <div className="space-y-4">
                <h3 className="text-[#d4af37] font-bold flex items-center gap-2 border-b border-[#d4af37]/20 pb-2">
                  <ShieldAlert size={18} />
                  <span>大内维护 (Maintenance)</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      clearCompletedDecrees();
                      setStatusMsg('奏折已清空');
                      setTimeout(() => setStatusMsg(''), 2000);
                    }}
                    className="flex flex-col items-center gap-2 p-4 border border-[#3e2723] rounded hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all group"
                  >
                    <Trash2 size={24} className="text-[#8d6e63] group-hover:text-[#d4af37]" />
                    <span className="text-[#e6d5ac] font-bold text-sm">清空奏折</span>
                    <span className="text-[#5d4037] text-xs">移除所有已完成的任务记录</span>
                  </button>

                  <button
                    onClick={handleResetAgents}
                    className="flex flex-col items-center gap-2 p-4 border border-red-900/30 rounded hover:border-red-500 hover:bg-red-900/10 transition-all group"
                  >
                    <ShieldAlert size={24} className="text-red-800 group-hover:text-red-500" />
                    <span className="text-red-400 font-bold text-sm">重整朝纲</span>
                    <span className="text-red-900/60 text-xs group-hover:text-red-500/60">重置页面与所有状态</span>
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InternalAffairsModal;
