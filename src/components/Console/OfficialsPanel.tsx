import React, { useState } from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { useConfigStore } from '../../store/useConfigStore';
import { COURT_ROLES } from '../../constants/court';
import type { AgentId } from '../../store/useAgentStore';
import clsx from 'clsx';
import { X, Plus, Server, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import AgentDetailModal from './AgentDetailModal';
import AppointmentModal from './AppointmentModal';

interface OfficialsPanelProps {
  onClose?: () => void;
  variant?: 'modal' | 'embedded';
}

const OfficialsPanel: React.FC<OfficialsPanelProps> = ({ onClose, variant = 'modal' }) => {
  const { agents: liveAgents } = useAgentStore();
  const { agents: configAgents, removeAgent, fetchOfficials } = useConfigStore();
  
  React.useEffect(() => {
      fetchOfficials();
  }, [fetchOfficials]);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);

  const isModal = variant === 'modal';

  const addNodeModal = (
      <AnimatePresence>
          {isAdding && (
              <AppointmentModal onClose={() => setIsAdding(false)} />
          )}
      </AnimatePresence>
  );

  const content = (
      <div 
        className={clsx(
          "bg-[#1a0f0f]/90 border border-[#8d6e63]/30 rounded-lg shadow-2xl overflow-hidden flex flex-col relative backdrop-blur-md",
          isModal ? "w-[900px] h-[600px]" : "w-full h-full"
        )}
      >
        {/* Header - Compact Mode for Embedded */}
        <div className={clsx(
            "bg-[#2c0b0e] flex items-center justify-between px-4 border-b border-[#d4af37]/30 shrink-0",
            isModal ? "h-16" : "h-12"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
                "rounded-full bg-[#8d6e63] flex items-center justify-center text-[#fffdf5] font-bold border border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]",
                isModal ? "w-10 h-10" : "w-7 h-7"
            )}>
              <Server size={isModal ? 20 : 14} />
            </div>
            {isModal && (
                <div>
                    <h2 className="text-xl font-serif font-bold text-[#e6d5ac] tracking-widest">OPENCLAW NODES</h2>
                    <p className="text-[10px] text-[#8d6e63] font-mono tracking-wider uppercase">Active Agents: {configAgents.length}</p>
                </div>
            )}
            {!isModal && (
                <div className="flex flex-col">
                    <span className="text-xs font-serif font-bold text-[#e6d5ac]">NODES</span>
                    <span className="text-[8px] text-[#8d6e63] font-mono">{configAgents.length} Active</span>
                </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsAdding(true)}
                className={clsx(
                    "flex items-center gap-2 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded text-[#d4af37] hover:bg-[#d4af37]/20 transition-all font-mono uppercase tracking-wide",
                    isModal ? "px-3 py-1.5 text-xs" : "p-1.5"
                )}
                title="Add Node"
            >
                <Plus size={14} /> 
                {isModal && "Add Node"}
            </button>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-[#d7ccc8] hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Content: Grid Layout */}
        <div className={clsx(
            "overflow-y-auto custom-scrollbar flex-1 bg-black/20",
            isModal ? "p-4" : "p-2"
        )}>
          <div className={clsx(
              "grid gap-2",
              isModal ? "grid-cols-1 lg:grid-cols-2 gap-4" : "grid-cols-1"
          )}>
            {configAgents.map((config) => {
              const roleId = config.role as AgentId;
              const role = COURT_ROLES[roleId] || {
                  id: roleId,
                  name: config.name,
                  title: config.name,
                  icon: Server,
                  color: 'gray',
                  description: config.description || 'Custom Agent'
              };
              const agent = liveAgents[roleId];
              const status = agent?.status || 'offline';
              const message = agent?.message || 'Connection lost...';
              
              return (
                <div key={roleId} className={clsx(
                    "relative group bg-[#1a0f0f] border border-[#3e2723] rounded-lg transition-all duration-300 flex flex-col shadow-lg",
                    isModal ? "p-3 gap-3 hover:border-[#d4af37]/50" : "p-2 gap-1 hover:bg-[#2c1810]"
                )}>
                  
                  {/* Top Row: Info & Status */}
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={clsx(
                          "rounded bg-[#2c1810] border border-[#5d4037] flex items-center justify-center text-[#8d6e63] shrink-0",
                          status === 'working' && "text-[#d4af37] border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.2)] animate-pulse",
                          isModal ? "w-10 h-10" : "w-8 h-8"
                        )}>
                          <role.icon size={isModal ? 20 : 16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className={clsx(
                                "font-bold text-[#e6d5ac] flex items-center gap-2 truncate",
                                isModal ? "text-sm" : "text-xs"
                            )}>
                                {role.title}
                                {isModal && (
                                    <span className="text-[10px] font-mono text-[#5d4037] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2c1810] border border-[#3e2723]">
                                        {config.port}
                                    </span>
                                )}
                            </h3>
                            {isModal && <p className="text-[10px] text-[#8d6e63] truncate">{role.description}</p>}
                            {!isModal && (
                                <p className="text-[9px] text-[#5d4037] font-mono truncate">:{config.port}</p>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {/* Compact Status Dot */}
                          {!isModal && (
                              <div className={clsx(
                                  "w-2 h-2 rounded-full",
                                  status === 'working' ? "bg-blue-400 animate-pulse shadow-[0_0_5px_blue]" :
                                  status === 'idle' ? "bg-green-400" :
                                  status === 'offline' ? "bg-gray-500" : "bg-red-400"
                              )} title={status} />
                          )}

                          {isModal && (
                            <div className={clsx(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider",
                                status === 'working' ? "bg-blue-900/20 border-blue-800 text-blue-400" :
                                status === 'idle' ? "bg-green-900/20 border-green-800 text-green-400" :
                                status === 'offline' ? "bg-gray-800/50 border-gray-700 text-gray-500" :
                                "bg-red-900/20 border-red-800 text-red-400"
                            )}>
                                <div className={clsx(
                                    "w-1.5 h-1.5 rounded-full",
                                    status === 'working' ? "bg-blue-400 animate-pulse" :
                                    status === 'idle' ? "bg-green-400" :
                                    status === 'offline' ? "bg-gray-500" : "bg-red-400"
                                )} />
                                {status}
                            </div>
                          )}
                          
                          {/* Delete Button */}
                          <button 
                            onClick={async (e) => { 
                                e.stopPropagation(); 
                                e.nativeEvent.stopImmediatePropagation();
                                await removeAgent(roleId); 
                            }}
                            className="text-[#5d4037] hover:text-red-400 p-1 transition-colors opacity-0 group-hover:opacity-100 relative z-20"
                            title="Remove Node"
                          >
                              <X size={14} />
                          </button>
                      </div>
                  </div>

                  {/* Terminal / Task View - Only in Modal */}
                  {isModal && (
                    <div className="flex-1 bg-black rounded border border-[#3e2723] p-2 font-mono text-[10px] relative overflow-hidden group/term">
                        <div className="absolute top-0 left-0 right-0 h-4 bg-[#1a0f0f] border-b border-[#3e2723] flex items-center px-2 gap-1">
                            <Terminal size={8} className="text-[#5d4037]" />
                            <span className="text-[#5d4037]">Console Output</span>
                        </div>
                        <div className="mt-4 text-gray-300 leading-relaxed min-h-[40px]">
                            {status === 'offline' ? (
                                <span className="text-gray-600 italic">No signal from node...</span>
                            ) : (
                                <>
                                    <span className="text-green-500/50 mr-2">$</span>
                                    {message}
                                    {status === 'working' && <span className="animate-pulse ml-1">_</span>}
                                </>
                            )}
                        </div>
                    </div>
                  )}

                  {/* Overlay for Click - Full Card Clickable */}
                  <div 
                      className="absolute inset-0 cursor-pointer z-0" 
                      onClick={() => setSelectedAgent(roleId)}
                  />

                </div>
              );
            })}
          </div>
          
          {/* Render the modal via Portal */}
          {createPortal(addNodeModal, document.body)}
          
          {/* Agent Detail Modal */}
          {selectedAgent && createPortal(
              <AnimatePresence>
                  <AgentDetailModal 
                      role={selectedAgent} 
                      onClose={() => setSelectedAgent(null)} 
                  />
              </AnimatePresence>,
              document.body
          )}
        </div>
        
        {/* Footer */}
        {isModal && (
            <div className="h-8 bg-[#150c0c] border-t border-[#3e2723]/30 flex items-center justify-between px-4 text-[10px] text-[#5d4037] font-mono uppercase tracking-wider shrink-0">
            <span>System: Online</span>
            <span>OpenClaw Dashboard v2.1</span>
            </div>
        )}
      </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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

export default OfficialsPanel;
