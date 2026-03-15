import React from 'react';
import { useCourtStore } from '../../store/useCourtStore';
import clsx from 'clsx';
import { X, CheckCircle, XCircle, AlertCircle, Clock, Scroll } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemorialsPanelProps {
  onClose?: () => void;
  variant?: 'modal' | 'embedded';
}

const MemorialsPanel: React.FC<MemorialsPanelProps> = ({ onClose, variant = 'modal' }) => {
  const { decrees } = useCourtStore();
  
  const sortedDecrees = [...decrees].sort((a, b) => 
    Number(b.id) - Number(a.id)
  );

  const isModal = variant === 'modal';

  const content = (
      <div 
        className={clsx(
          "bg-[#1a0f0f]/95 border border-[#d4af37]/20 rounded-lg shadow-2xl overflow-hidden flex flex-col relative backdrop-blur-lg",
          isModal ? "w-[900px] h-[700px]" : "w-full h-full"
        )}
      >
        {/* Header */}
        {isModal && (
          <div className="h-14 bg-[#0f0a0a] flex items-center justify-between px-6 border-b border-[#d4af37]/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold border border-[#d4af37]/50">
                奏
              </div>
              <h2 className="text-xl font-serif font-bold text-[#e6d5ac] tracking-widest">奏折阁 (Imperial Archives)</h2>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[#d4af37]/10 p-1.5 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}

        {/* Content: Scroll List */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-gradient-to-b from-[#1a0f0f] to-[#0f0a0a]">
          <div className="space-y-6">
            {sortedDecrees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#d4af37]/30 py-20">
                 <div className="w-16 h-1 bg-current opacity-20 rounded-full mb-4"></div>
                 <span className="font-serif italic text-lg">暂无奏折存档...</span>
              </div>
            ) : (
              sortedDecrees.map((decree) => (
                <div key={decree.id} className="group bg-black/40 border border-[#d4af37]/10 rounded-lg shadow-lg hover:border-[#d4af37]/30 transition-all p-4 relative overflow-hidden">
                   {/* Decorative corner */}
                   <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#d4af37]/10 to-transparent pointer-events-none"></div>

                  {/* Header: ID, Status, Time */}
                  <div className="flex justify-between items-center mb-4 border-b border-[#d4af37]/10 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-serif font-bold text-[#d4af37]/60 text-sm tracking-widest">
                        {formatDecreeId(decree.id)}
                      </span>
                      <StatusBadge status={decree.status} />
                    </div>
                    <span className="text-xs text-[#8d6e63] font-mono">
                      {new Date(Number(decree.id)).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  
                  {/* Conversation View */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-4">
                      {/* Emperor's Decree (User Input) - Should be on the RIGHT */}
                      <div className="flex gap-3 flex-row-reverse">
                          <div className="w-8 h-8 rounded-full bg-[#b71c1c]/20 border border-[#b71c1c]/40 flex items-center justify-center text-[#b71c1c] font-bold text-xs shrink-0">
                              朕
                          </div>
                          <div className="flex-1 flex flex-col items-end">
                              <div className="text-[#b71c1c]/80 text-xs font-bold mb-1">皇帝 (Emperor)</div>
                              <div className="bg-[#b71c1c]/10 border border-[#b71c1c]/20 rounded-l-lg rounded-br-lg p-3 text-[#e6d5ac] font-serif font-bold leading-relaxed text-left">
                                  {decree.content}
                              </div>
                          </div>
                      </div>

                      {/* Agent Replies (Filtered Logs) - Should be on the LEFT */}
                      {decree.logs
                        .filter(log => 
                            log.actor !== 'Emperor' && 
                            log.actor !== 'System' && 
                            log.action === '回复' &&
                            log.details !== 'Ready' && // Filter "Ready"
                            log.details !== '' // Filter empty
                        )
                        .map((log, idx) => (
                          <div key={idx} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-bold text-xs shrink-0">
                                  {log.actor.charAt(0)}
                              </div>
                              <div className="flex-1">
                                  <div className="text-[#d4af37]/80 text-xs font-bold mb-1">{log.actor}</div>
                                  <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-r-lg rounded-bl-lg p-3 text-[#d7ccc8] text-sm leading-relaxed text-left whitespace-pre-wrap">
                                      {log.details || log.action}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Footer: Plan & System Logs (Collapsed or Compact) */}
                  {(decree.plan.length > 0 || decree.logs.length > 0) && (
                      <div className="mt-4 pt-3 border-t border-[#d4af37]/10">
                          <details className="group/details">
                              <summary className="cursor-pointer text-[#8d6e63] text-xs hover:text-[#d4af37] transition-colors flex items-center gap-2 select-none">
                                  <Clock size={12} />
                                  <span>查看执行细节 ({decree.logs.length} 条记录)</span>
                              </summary>
                              <div className="mt-2 pl-4 border-l-2 border-[#d4af37]/10 space-y-1">
                                  {decree.plan.length > 0 && (
                                      <div className="mb-2">
                                          <div className="text-[#d4af37]/50 text-[10px] font-bold mb-1">执行计划:</div>
                                          <ul className="list-disc list-inside text-[#8d6e63] text-[10px]">
                                              {decree.plan.map((step, i) => <li key={i}>{step}</li>)}
                                          </ul>
                                      </div>
                                  )}
                                  {decree.logs.slice(-5).map((log, i) => (
                                      <div key={i} className="text-[10px] text-[#5d4037] flex gap-2">
                                          <span className="opacity-50">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                          <span className={clsx("font-bold", log.actor === 'System' ? 'text-blue-900/50' : 'text-[#d4af37]/50')}>{log.actor}:</span>
                                          <span className="truncate">{log.action}</span>
                                      </div>
                                  ))}
                              </div>
                          </details>
                      </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {content}
      </motion.div>
    </div>
  );
};

// Helper: Format ID to Chinese Style
const formatDecreeId = (id: string) => {
  const last4 = id.slice(-4);
  return `奉天承运第 ${last4} 号`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let color = 'bg-[#1a0f0f] text-gray-500 border-gray-800';
  let icon = <Clock size={12} />;
  let label = status;

  switch (status) {
    case 'completed':
      color = 'bg-green-950/30 text-green-400 border-green-900/50';
      icon = <CheckCircle size={12} />;
      label = '已办结';
      break;
    case 'rejected':
      color = 'bg-red-950/30 text-red-400 border-red-900/50';
      icon = <XCircle size={12} />;
      label = '已驳回';
      break;
    case 'cancelled':
      color = 'bg-gray-900/50 text-gray-500 border-gray-800';
      icon = <XCircle size={12} />;
      label = '已撤销';
      break;
    case 'executing':
      color = 'bg-blue-950/30 text-blue-400 border-blue-900/50';
      icon = <Clock size={12} />;
      label = '执行中';
      break;
    case 'reviewing':
      color = 'bg-yellow-950/30 text-yellow-400 border-yellow-900/50';
      icon = <AlertCircle size={12} />;
      label = '审核中';
      break;
    case 'planning':
      color = 'bg-purple-950/30 text-purple-400 border-purple-900/50';
      icon = <Scroll size={12} />;
      label = '拟旨中';
      break;
    case 'paused':
      color = 'bg-orange-950/30 text-orange-400 border-orange-900/50';
      icon = <Clock size={12} />;
      label = '暂缓中';
      break;
  }

  return (
    <div className={clsx("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border backdrop-blur-sm", color)}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

export default MemorialsPanel;
