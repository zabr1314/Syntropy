import React, { useState, useMemo } from 'react';
import { useCourtStore } from '../../store/useCourtStore';
import { useAgentStore } from '../../store/useAgentStore';
import { LiveAgentService } from '../../services/LiveAgentService';
import { Feather, Send, Pause, Play, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const DecreePipeline: React.FC = () => {
  const [input, setInput] = useState('');
  const { addDecree, cancelDecree, activeDecreeId, decrees, pauseDecree, resumeDecree, draftInput, setDraftInput } = useCourtStore();
  const { addLog } = useAgentStore();
  const [isFocused, setIsFocused] = useState(false);

  // History Navigation
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);

  // Sync draftInput from store
  React.useEffect(() => {
    if (draftInput) {
      setInput(prev => {
        // If appending @mention, add space if needed
        if (draftInput.startsWith('@') && prev && !prev.endsWith(' ')) {
          return prev + ' ' + draftInput;
        }
        // If it's a full command, replace
        return draftInput;
      });
      // Clear draft after consuming
      setDraftInput('');
    }
  }, [draftInput, setDraftInput]);

  const activeDecree = useMemo(() => 
    decrees.find(d => d.id === activeDecreeId), 
    [decrees, activeDecreeId]
  );

  const isPaused = activeDecree?.status === 'paused';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    console.log('[DecreePipeline] Submitting:', trimmedInput);

    // 临时移除阻塞逻辑，允许随时发送指令
    // if (activeDecreeId) { ... }

    // Use the store's addDecree which handles ID generation and initial state
    addDecree(trimmedInput);
    
    addLog(`皇帝：${trimmedInput}`);

    // --- 皇帝气泡映射 ---
    // 将输入内容显示在皇帝头顶
    const { setAgentStatus } = useAgentStore.getState();
    setAgentStatus('emperor', 'working', trimmedInput);
    
    // 3秒后清除气泡（或根据长度计算）
    setTimeout(() => {
        setAgentStatus('emperor', 'idle', '');
    }, Math.max(3000, trimmedInput.length * 200));
    // --------------------

    // --- 反向联通：发送指令给 OpenClaw ---
    // 默认发送给 'minister' (丞相) 处理
    // 如果支持 @agent 语法，这里可以解析
    const targetAgentId = 'minister'; 
    const success = LiveAgentService.getInstance().sendCommand(targetAgentId, 'chat', {
        content: trimmedInput,
        role: 'user'
    });

    if (success) {
        addLog(`系统：圣旨已传达给 [${targetAgentId}]`);
    } else {
        addLog(`系统：圣旨传达失败 (Live Uplink Offline)`);
    }
    // -------------------------------------
    
    // Add to history
    setHistory(prev => [trimmedInput, ...prev]);
    setHistoryIndex(-1);
    
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleTogglePause = () => {
    if (!activeDecreeId) return;
    
    if (isPaused) {
      resumeDecree(activeDecreeId);
      addLog('系统：恢复任务执行');
    } else {
      pauseDecree(activeDecreeId);
      addLog('系统：暂停任务执行');
    }
  };

  return (
    <div className="w-full max-w-4xl flex items-center gap-4">
      {/* Imperial Input Area */}
      <form onSubmit={handleSubmit} className="flex-1 relative group">
        <div className={clsx(
          "relative flex items-center transition-all duration-300 rounded-full overflow-hidden",
          "bg-[#1a0f0f]/60 border backdrop-blur-md",
          isFocused 
            ? "border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]" 
            : "border-[#d4af37]/20 hover:border-[#d4af37]/40"
        )}>
          {/* Left Icon (Ink Brush) */}
          <div className="pl-5 pr-3 text-[#d4af37] opacity-50" title="颁布圣旨">
            <Feather size={18} />
          </div>

          {/* Input Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="拟定圣旨 (输入指令)..."
            className="flex-1 bg-transparent py-3 text-base font-serif font-bold text-[#e6d5ac] placeholder-[#d4af37]/20 outline-none tracking-wider"
          />

          {/* Right Actions (Submit) */}
          <div className="pr-2 flex items-center gap-1">
            {input && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                type="submit"
                className="p-2 bg-[#d4af37] text-[#1a0f0f] rounded-full hover:bg-[#ffd700] transition-colors shadow-lg flex items-center justify-center"
              >
                <Send size={14} />
              </motion.button>
            )}
          </div>
        </div>
      </form>

      {/* Global Controls (Integrated into the pipeline line) */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTogglePause}
          disabled={!activeDecreeId}
          className={clsx(
            "flex items-center justify-center w-10 h-10 rounded-full transition-all border",
            !activeDecreeId ? "opacity-30 cursor-not-allowed border-[#d4af37]/10 text-[#d4af37]/20" :
            isPaused 
              ? "bg-[#d4af37] text-[#1a0f0f] border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse" 
              : "bg-[#1a0f0f]/60 text-[#d4af37]/60 border-[#d4af37]/20 hover:border-[#d4af37] hover:text-[#d4af37]"
          )}
          title={isPaused ? "继续执行" : "暂停系统"}
        >
          {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
        </button>

        {activeDecreeId && (
          <button
            onClick={() => cancelDecree(activeDecreeId)}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all border bg-red-900/20 text-red-500/60 border-red-900/40 hover:bg-red-900/40 hover:text-red-500 hover:border-red-500"
            title="撤回圣旨"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DecreePipeline;
