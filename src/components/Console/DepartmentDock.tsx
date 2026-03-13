import React from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { useConfigStore } from '../../store/useConfigStore';
import { useCourtStore } from '../../store/useCourtStore';
import { COURT_ROLES } from '../../constants/court';
import clsx from 'clsx';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

const DepartmentDock: React.FC = () => {
  const { agents, isMeeting, setMeeting, setTargetPosition, addLog } = useAgentStore();
  const { agents: configAgents } = useConfigStore();
  const { setDraftInput } = useCourtStore();
  
  // Use configured agents instead of static roles
  const activeRoles = configAgents.map(config => {
    // Try to get predefined role, or fallback to dynamic role object
    const role = COURT_ROLES[config.role];
    if (role) return role;
    
    return {
      id: config.role,
      title: config.name,
      name: config.name,
      icon: Users, // Default icon for custom agents
      color: 'gray',
      description: config.description || 'Custom Official'
    };
  }).filter((role): role is NonNullable<typeof role> => Boolean(role)); // Filter out any null/undefined entries just in case
  
  const handleMeetingToggle = () => {
    const newMeetingState = !isMeeting;
    setMeeting(newMeetingState);
    
    if (newMeetingState) {
      addLog('系统：百官上朝！');
      // 设定朝会位置 (太和殿前)
      setTargetPosition('emperor', 400, 100);
      setTargetPosition('minister', 400, 180);
      setTargetPosition('official_personnel', 350, 220);
      setTargetPosition('official_revenue', 350, 280);
      setTargetPosition('official_rites', 350, 340);
      setTargetPosition('official_war', 450, 220);
      setTargetPosition('official_justice', 450, 280);
      setTargetPosition('official_works', 450, 340);
      setTargetPosition('historian', 100, 500); 
    } else {
      addLog('系统：退朝！百官归位。');
      // 恢复原位
      setTargetPosition('emperor', 400, 100);
      setTargetPosition('minister', 320, 180);
      setTargetPosition('official_personnel', 150, 150);
      setTargetPosition('official_revenue', 150, 250);
      setTargetPosition('official_rites', 150, 350);
      setTargetPosition('official_war', 650, 150);
      setTargetPosition('official_justice', 650, 250);
      setTargetPosition('official_works', 650, 350);
      setTargetPosition('historian', 50, 550);
    }
  };

  const handleAgentClick = (agentId: string) => {
    setDraftInput(`@${agentId} `);
  };

  return (
    <div className="flex items-center h-full gap-3">
      {/* 1. Meeting Control */}
      <button 
        onClick={handleMeetingToggle}
        className={clsx(
          "group relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300",
          isMeeting 
            ? "bg-[#d4af37] text-[#1a0f0f] border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.6)]" 
            : "border-[#d4af37]/30 text-[#d4af37]/60 hover:border-[#d4af37] hover:text-[#d4af37] hover:bg-[#d4af37]/10"
        )}
        title={isMeeting ? "退朝" : "上朝"}
      >
        <Users size={18} />
      </button>

      {/* Vertical Divider */}
      <div className="h-6 w-px bg-[#d4af37]/20"></div>

      {/* 2. Ministry Status HUD */}
      <div className="flex items-center gap-1.5">
        {activeRoles.map((role) => {
          const agent = agents[role.id];
          const status = agent?.status || 'idle';
          const message = agent?.message || '等待指令...';
          
          return (
            <div key={role.id} className="relative group">
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[200px] pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
                  <div className="glass-panel text-xs p-2 rounded shadow-xl border border-[#d4af37]/30 backdrop-blur-md bg-[#1a0f0f]/90">
                    <div className="font-bold text-[#e6d5ac] mb-1 text-center font-serif flex items-center justify-center gap-1">
                      {role.title}
                    </div>
                    <div className={clsx(
                      "font-mono leading-tight text-[10px]",
                      status === 'working' ? "text-blue-400" :
                      status === 'error' ? "text-red-400" :
                      "text-gray-400"
                    )}>
                      {message}
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="w-3 h-3 bg-[#1a0f0f]/90 border-r border-b border-[#d4af37]/30 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
              </div>

              {/* Status Token (Compact) */}
              <motion.div
                onClick={() => handleAgentClick(role.id)}
                whileHover={{ scale: 1.1, y: -2 }}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 cursor-help",
                  // Idle
                  status === 'idle' && "border-[#d4af37]/10 bg-[#1a0f0f]/30 text-[#d4af37]/40 hover:border-[#d4af37]/50 hover:text-[#d4af37]",
                  // Working
                  status === 'working' && "border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.4)] animate-pulse",
                  // Moving
                  status === 'moving' && "border-[#e6d5ac]/50 text-[#e6d5ac] border-dashed animate-spin-slow",
                  // Error
                  status === 'error' && "border-red-600 bg-red-900/20 text-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)] animate-shake",
                  // Offline (New)
                  status === 'offline' && "border-gray-800 bg-gray-900/50 text-gray-700"
                )}
              >
                <role.icon size={14} strokeWidth={2} />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DepartmentDock;
