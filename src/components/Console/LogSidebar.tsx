import React, { useEffect, useRef } from 'react';
import { useCourtStore } from '../../store/useCourtStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScrollText } from 'lucide-react';
import clsx from 'clsx';
import { COURT_ROLES } from '../../constants/court';

interface LogSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'embedded';
}

const LogSidebar: React.FC<LogSidebarProps> = ({ isOpen = true, onClose, variant = 'modal' }) => {
  const { decrees, activeDecreeId } = useCourtStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isModal = variant === 'modal';

  // Auto scroll to bottom of active log
  useEffect(() => {
    if ((isModal && isOpen) || !isModal) {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }
  }, [isOpen, decrees, isModal]);

  const content = (
      <div 
        className={clsx(
          "bg-[#1a0f0f]/90 border border-[#8d6e63]/30 shadow-2xl flex flex-col backdrop-blur-md overflow-hidden",
          isModal ? "absolute right-6 bottom-[80px] w-96 max-h-[60vh] rounded-lg" : "w-full h-full rounded-lg"
        )}
      >
        {/* Header (Only show in Modal mode) */}
        {isModal && (
          <div className="flex items-center justify-between p-3 border-b border-[#d4af37]/20 bg-[#2c0b0e] relative z-10">
            <div className="flex items-center gap-2 text-[#e6d5ac] font-serif font-bold tracking-wider uppercase text-sm">
              <ScrollText size={16} className="text-[#d4af37]" />
              <span>起居注 (System Logs)</span>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-[#8d6e63] hover:text-[#d4af37] transition-colors p-1 hover:bg-[#d4af37]/10 rounded">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Content: Terminal Style but with Imperial flair */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 custom-scrollbar font-mono text-xs" ref={scrollRef}>
          {decrees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#5d4037]">
              <div className="w-2 h-2 bg-[#5d4037] animate-pulse mb-2"></div>
              <span className="italic">等待系统事件...</span>
            </div>
          ) : (
            decrees.slice().reverse().map(decree => (
              <div 
                key={decree.id} 
                className={clsx(
                  "border-l-2 pl-3 transition-all",
                  decree.id === activeDecreeId 
                    ? "border-[#d4af37] opacity-100" 
                    : "border-[#5d4037]/30 opacity-60 hover:opacity-80"
                )}
              >
                {/* Decree Header */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[#8d6e63] text-[10px]">#{decree.id.slice(-4)}</span>
                  <span className={clsx(
                    "font-bold uppercase tracking-wider",
                    decree.status === 'completed' ? "text-[#4d7c5e]" :
                    decree.status === 'rejected' ? "text-[#c0392b]" :
                    "text-[#d4af37]"
                  )}>
                    [{decree.status}]
                  </span>
                  <span className="text-[#e6d5ac] truncate max-w-[150px]" title={decree.content}>
                    {decree.content}
                  </span>
                </div>

                {/* Logs Stream */}
                <div className="space-y-2 mt-2">
                  {decree.logs.map((log, i) => {
                    // 过滤无意义的系统日志
                    if (log.actor === 'System' && (log.action.includes('移动') || log.action.includes('状态更新'))) return null;
                    
                    const isReply = log.action === '回复';
                    const isImportant = isReply || log.actor === 'Emperor';

                    return (
                    <div key={i} className={clsx(
                        "flex gap-2 text-[#d7ccc8]/80 leading-relaxed rounded p-1",
                        isImportant ? "bg-[#d4af37]/5" : ""
                    )}>
                      <span className="text-[#5d4037] min-w-[50px] tabular-nums text-[10px] mt-0.5 opacity-50">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                      <div className="flex-1 break-words">
                        <span className={clsx("font-bold mr-2 text-xs", getActorColor(log.actor))}>
                          {getActorDisplayName(log.actor)}
                        </span>
                        <span className={clsx(
                            "text-xs truncate",
                            log.action.includes('Error') || log.action.includes('Failed') ? "text-red-400" : 
                            isReply ? "text-[#e6d5ac]" : "text-[#d7ccc8]"
                        )}>
                            {isReply ? (log.details ? '【回复】 (详见奏折阁)' : '【回复】') : log.action}
                        </span>
                        {log.details && !isReply && (
                          <div className="text-[#8d6e63] mt-0.5 pl-2 border-l border-[#5d4037]/30 italic text-[10px] truncate">
                            {log.details}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            ))
          )}
          
          {/* Live Cursor */}
          <div className="h-4 w-2 bg-[#d4af37] animate-pulse mt-2"></div>
        </div>
        
        {/* Footer Status Bar */}
        <div className="h-6 bg-[#0f0a0a] border-t border-[#3e2723]/30 flex items-center justify-between px-3 text-[9px] text-[#5d4037] font-mono">
           <span>状态: 运行中</span>
           <span>内存: {((decrees.length * 1024) / 1024).toFixed(2)} KB</span>
        </div>
      </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Click to close) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 z-40 pointer-events-auto"
          />

          {/* Sidebar (Bamboo Slip Style) */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: 20, scaleY: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed z-50 pointer-events-none" // Container for motion
            style={{ right: 0, bottom: 0, left: 0, top: 0 }}
          >
             {/* We need to position the actual sidebar content */}
             {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    drafting: 'bg-gray-200 text-gray-700 border-gray-400',
    planning: 'bg-blue-100 text-blue-800 border-blue-300',
    reviewing: 'bg-purple-100 text-purple-800 border-purple-300',
    executing: 'bg-orange-100 text-orange-800 border-orange-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    approved: 'bg-cyan-100 text-cyan-800 border-cyan-300'
  };

  const labels: Record<string, string> = {
    drafting: '拟旨',
    planning: '规划',
    reviewing: '审核',
    executing: '执行',
    completed: '完成',
    rejected: '驳回',
    approved: '批准'
  };
  
  return (
    <span className={clsx(
      "text-[10px] font-bold px-2 py-0.5 rounded border shadow-sm font-serif tracking-widest",
      styles[status as keyof typeof styles] || 'bg-gray-200 text-gray-700'
    )}>
      {labels[status] || status}
    </span>
  );
};

function getActorColor(actorName: string): string {
  if (actorName === 'Emperor' || actorName === 'System') return 'text-[#b71c1c]'; // Imperial Red
  
  // Try to find role by name or title, handling English keys if they slip through
  const role = Object.values(COURT_ROLES).find(r => 
    r.name === actorName || 
    r.title === actorName ||
    r.id === actorName // Match 'Secretariat', 'MinistryOfWar' etc.
  );
  
  if (role) {
    const map: Record<string, string> = {
      blue: 'text-blue-800',
      red: 'text-red-800',
      orange: 'text-orange-800',
      yellow: 'text-yellow-800',
      purple: 'text-purple-800',
      cyan: 'text-cyan-800'
    };
    return map[role.color] || 'text-[#3e2723]';
  }
  
  return 'text-[#3e2723]';
}

function getActorDisplayName(actorName: string): string {
  if (actorName === 'Emperor') return '陛下';
  if (actorName === 'System') return '天命';

  // Explicit mapping for Service Class names to Chinese Titles
  const classMap: Record<string, string> = {
    'Secretariat': '中书省',
    'Chancellery': '门下省',
    'DepartmentOfState': '尚书省',
    'MinistryOfWar': '兵部',
    'MinistryOfRevenue': '户部',
    'MinistryOfRites': '礼部',
    'MinistryOfWorks': '工部',
    'MinistryOfJustice': '刑部',
    'Minister': '中书省',
    'Censor': '门下省',
    'General': '兵部',
    'Treasurer': '户部',
    'Scholar': '礼部',
    'Engineer': '工部'
  };

  if (classMap[actorName]) return classMap[actorName];

  // Fallback: Map English role IDs/Names to Chinese Titles from constants
  const role = Object.values(COURT_ROLES).find(r => r.id === actorName || r.name === actorName);
  if (role) return role.title;

  return actorName;
}

export default LogSidebar;
