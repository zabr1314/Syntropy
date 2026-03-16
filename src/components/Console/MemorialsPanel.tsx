import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCourtStore } from '../../store/useCourtStore';
import { useConfigStore } from '../../store/useConfigStore';
import clsx from 'clsx';
import { X, CheckCircle, XCircle, AlertCircle, Clock, Scroll, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import DecisionTrace from './DecisionTrace';
import type { DecisionNode } from '../../store/useCourtStore';

interface MemorialsPanelProps {
  onClose?: () => void;
  variant?: 'modal' | 'embedded';
}

const DecisionTraceModal: React.FC<{ tree: DecisionNode; summary?: string; onClose: () => void }> = ({ tree, summary, onClose }) => createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      className="relative bg-[#0f0a0a] border border-[#d4af37]/30 rounded-xl shadow-2xl w-[92vw] h-[88vh] flex flex-col overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="h-12 bg-[#0a0606] border-b border-[#d4af37]/20 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2 text-[#d4af37]">
          <GitBranch size={15} />
          <span className="font-mono font-bold text-sm tracking-widest uppercase">决策链 Decision Trace</span>
        </div>
        <button onClick={onClose} className="text-[#d4af37]/50 hover:text-[#d4af37] transition-colors p-1 rounded">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar p-8">
        <DecisionTrace tree={tree} summary={summary} />
      </div>
    </motion.div>
  </div>,
  document.body
);

const MemorialsPanel: React.FC<MemorialsPanelProps> = ({ onClose, variant = 'modal' }) => {
  const { decrees } = useCourtStore();
  const { agents } = useConfigStore();
  const [openTraceId, setOpenTraceId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sortedDecrees = [...decrees].sort((a, b) =>
    Number(b.id) - Number(a.id)
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Helper: Get agent display info by actor name
  const getAgentInfo = (actorName: string) => {
    // Try to find by role (id) first
    let agent = agents.find(a => a.role === actorName);
    // Fallback: try to find by name
    if (!agent) {
      agent = agents.find(a => a.name === actorName);
    }
    return {
      displayName: agent?.identity?.name || agent?.name || actorName,
      emoji: agent?.identity?.emoji || actorName.charAt(0)
    };
  };

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
          <div className="space-y-3">
            {sortedDecrees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#d4af37]/30 py-20">
                 <div className="w-16 h-1 bg-current opacity-20 rounded-full mb-4"></div>
                 <span className="font-serif italic text-lg">暂无奏折存档...</span>
              </div>
            ) : (
              sortedDecrees.map((decree) => {
                const isExpanded = expandedIds.has(decree.id);
                const contentPreview = decree.content.length > 30 ? decree.content.slice(0, 30) + '...' : decree.content;

                return (
                <div key={decree.id} className="group bg-black/40 border border-[#d4af37]/10 rounded-lg shadow-lg hover:border-[#d4af37]/30 transition-all p-3 relative overflow-hidden">
                   {/* Decorative corner */}
                   <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#d4af37]/10 to-transparent pointer-events-none"></div>

                  {/* Header row: ID+badge (left) | 决策链+time (right) — both shrink-0 */}
                  <div
                    className="flex justify-between items-center cursor-pointer gap-2"
                    onClick={() => toggleExpand(decree.id)}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-serif font-bold text-[#d4af37]/60 text-sm tracking-widest">
                        {formatDecreeId(decree.id)}
                      </span>
                      <StatusBadge status={decree.status} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {decree.decisionTree && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenTraceId(openTraceId === decree.id ? null : decree.id);
                          }}
                          className={clsx(
                            'flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-all',
                            openTraceId === decree.id
                              ? 'bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]'
                              : 'bg-transparent border-[#d4af37]/20 text-[#d4af37]/40 hover:border-[#d4af37]/50 hover:text-[#d4af37]/70'
                          )}
                          title="查看决策链"
                        >
                          <GitBranch size={10} />
                          决策链
                        </button>
                      )}
                      <span className="text-xs text-[#8d6e63] font-mono whitespace-nowrap">
                        {formatTimestamp(decree.id)}
                      </span>
                    </div>
                  </div>
                  {/* Content preview — second line, only when collapsed */}
                  {!isExpanded && (
                    <div className="mt-1 text-xs text-[#d7ccc8]/50 truncate cursor-pointer" onClick={() => toggleExpand(decree.id)}>
                      {contentPreview}
                    </div>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <>
                      <div className="mt-3 pt-3 border-t border-[#d4af37]/10">
                        {/* Main View: Decree + Final Reply Only */}
                        <div className="space-y-2 mb-3">
                            {/* Emperor's Decree */}
                            <div className="flex gap-2 flex-row-reverse">
                                <div className="w-6 h-6 rounded-full bg-[#b71c1c]/20 border border-[#b71c1c]/40 flex items-center justify-center text-[#b71c1c] font-bold text-[10px] shrink-0">
                                    朕
                                </div>
                                <div className="flex-1 flex flex-col items-end">
                                    <div className="text-[#b71c1c]/80 text-[10px] font-bold mb-1">皇帝</div>
                                    <div className="bg-[#b71c1c]/10 border border-[#b71c1c]/20 rounded-l-lg rounded-br-lg p-2 text-[#e6d5ac] font-serif text-sm leading-relaxed text-left prose-sm prose-invert max-w-none">
                                        <ReactMarkdown
                                          components={{
                                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                            code: ({children}) => <code className="bg-black/30 px-1 py-0.5 rounded text-xs">{children}</code>,
                                            pre: ({children}) => <pre className="bg-black/40 p-2 rounded overflow-x-auto text-xs">{children}</pre>,
                                            ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                            ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                            li: ({children}) => <li className="mb-1">{children}</li>,
                                            strong: ({children}) => <strong className="font-bold text-[#f4e4c1]">{children}</strong>,
                                            em: ({children}) => <em className="italic text-[#e6d5ac]/90">{children}</em>,
                                          }}
                                        >
                                          {decree.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>

                            {/* Final Agent Reply Only */}
                            {(() => {
                              const validReplies = decree.logs.filter(log =>
                                  log.actor !== 'Emperor' &&
                                  log.actor !== 'System' &&
                                  log.action === '回复' &&
                                  log.details !== 'Ready' &&
                                  log.details !== ''
                              );
                              const lastReply = validReplies[validReplies.length - 1];

                              if (!lastReply) return null;

                              const agentInfo = getAgentInfo(lastReply.actor);
                              return (
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] text-xs shrink-0">
                                        {agentInfo.emoji}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[#d4af37]/80 text-[10px] font-bold mb-1">{agentInfo.displayName}</div>
                                        <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-r-lg rounded-bl-lg p-2 text-[#d7ccc8] text-sm leading-relaxed text-left prose-sm prose-invert max-w-none">
                                            <ReactMarkdown
                                              components={{
                                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                                code: ({children}) => <code className="bg-black/30 px-1 py-0.5 rounded text-xs">{children}</code>,
                                                pre: ({children}) => <pre className="bg-black/40 p-2 rounded overflow-x-auto text-xs">{children}</pre>,
                                                ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                                ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                                li: ({children}) => <li className="mb-1">{children}</li>,
                                                strong: ({children}) => <strong className="font-bold text-[#e6d5ac]">{children}</strong>,
                                                em: ({children}) => <em className="italic text-[#d7ccc8]/90">{children}</em>,
                                              }}
                                            >
                                              {lastReply.details || lastReply.action}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                              );
                            })()}
                        </div>

                        {/* Collapsible: Full Conversation History */}
                        {(() => {
                          const validReplies = decree.logs.filter(log =>
                              log.actor !== 'Emperor' &&
                              log.actor !== 'System' &&
                              log.action === '回复' &&
                              log.details !== 'Ready' &&
                              log.details !== ''
                          );

                          if (validReplies.length <= 1) return null; // No intermediate replies

                          return (
                            <div className="pt-2 border-t border-[#d4af37]/10">
                                <details className="group/details">
                                    <summary className="cursor-pointer text-[#8d6e63] text-xs hover:text-[#d4af37] transition-colors flex items-center gap-2 select-none">
                                        <Scroll size={12} />
                                        <span>查看完整对话 ({validReplies.length} 条回复)</span>
                                    </summary>
                                    <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                        {validReplies.map((log, idx) => {
                                          const agentInfo = getAgentInfo(log.actor);
                                          return (
                                            <div key={idx} className="flex gap-2">
                                                <div className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] text-[10px] shrink-0">
                                                    {agentInfo.emoji}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[#d4af37]/80 text-[10px] font-bold mb-1">{agentInfo.displayName}</div>
                                                    <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 rounded p-1.5 text-[#d7ccc8] text-xs leading-relaxed">
                                                        <ReactMarkdown
                                                          components={{
                                                            p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                                                            code: ({children}) => <code className="bg-black/30 px-1 py-0.5 rounded text-[10px]">{children}</code>,
                                                            pre: ({children}) => <pre className="bg-black/40 p-1.5 rounded overflow-x-auto text-[10px]">{children}</pre>,
                                                            ul: ({children}) => <ul className="list-disc list-inside mb-1">{children}</ul>,
                                                            ol: ({children}) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
                                                            li: ({children}) => <li className="mb-0.5">{children}</li>,
                                                            strong: ({children}) => <strong className="font-bold text-[#e6d5ac]">{children}</strong>,
                                                            em: ({children}) => <em className="italic text-[#d7ccc8]/90">{children}</em>,
                                                          }}
                                                        >
                                                          {log.details || log.action}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                </details>
                            </div>
                          );
                        })()}

                        {/* Footer: Plan & System Logs */}
                        {(decree.plan.length > 0 || decree.logs.length > 0) && (
                            <div className="pt-2 border-t border-[#d4af37]/10">
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
                    </>
                  )}

                </div>
              )})
            )}
          </div>
        </div>
      </div>
  );

  const activeTrace = openTraceId ? decrees.find(d => d.id === openTraceId)?.decisionTree : null;
  const activeDecree = openTraceId ? decrees.find(d => d.id === openTraceId) : null;
  const ministerSummary = activeDecree?.logs.find(log => log.actor === 'Minister' || log.actor === '丞相' || log.actor === 'minister')?.details || activeDecree?.logs.filter(log => log.actor !== 'Emperor' && log.actor !== 'System').slice(-1)[0]?.details;

  if (!isModal) {
    return (
      <>
        {content}
        <AnimatePresence>
          {activeTrace && <DecisionTraceModal tree={activeTrace} summary={ministerSummary} onClose={() => setOpenTraceId(null)} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {content}
      </motion.div>
    </div>
    <AnimatePresence>
      {activeTrace && <DecisionTraceModal tree={activeTrace} onClose={() => setOpenTraceId(null)} />}
    </AnimatePresence>
    </>
  );
};

// Helper: Format ID to Chinese Style
const formatDecreeId = (id: string) => {
  const last4 = id.slice(-4);
  return `奉天承运第 ${last4} 号`;
};

// Helper: Format timestamp safely
const formatTimestamp = (id: string) => {
  const timestamp = Number(id);
  if (isNaN(timestamp) || timestamp <= 0) {
    return '--';
  }
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
    <div className={clsx("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border backdrop-blur-sm whitespace-nowrap", color)}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

export default MemorialsPanel;
