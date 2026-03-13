import React, { useState, useEffect } from 'react';
import DepartmentDock from './DepartmentDock';
import DecreePipeline from './DecreePipeline';
import SystemStatus from './SystemStatus';
import { useAgentStore } from '../../store/useAgentStore';
import clsx from 'clsx';

const ConsoleLayout: React.FC = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const { updateMetrics, metrics } = useAgentStore();

  useEffect(() => {
    const handleEmergency = () => {
      setIsEmergency(true);
      setTimeout(() => setIsEmergency(false), 5000);
    };
    
    window.addEventListener('emergency-assembly', handleEmergency);
    return () => window.removeEventListener('emergency-assembly', handleEmergency);
  }, []);

  // Simulate metrics
  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics({
        cpu: Math.max(0, Math.min(100, metrics.cpu + (Math.random() - 0.5) * 10)),
        users: Math.max(0, Math.floor(metrics.users + (Math.random() - 0.5) * 20)),
        tickets: Math.max(0, Math.floor(metrics.tickets + (Math.random() - 0.5) * 2))
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [metrics.cpu, metrics.users, metrics.tickets, updateMetrics]);

  return (
    <div className={clsx(
      "relative w-full h-[90px] z-50 transition-all duration-500 flex items-end pb-2",
      "bg-gradient-to-t from-[#0a0505] via-[#1a0f0f] to-transparent",
      isEmergency && "animate-pulse from-red-950 via-red-900/50"
    )}>
      
      {/* Decorative Top Border (Fading) */}
      <div className="absolute top-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent"></div>

      {/* Main Dock Container */}
      <div className="w-full max-w-[1920px] mx-auto px-6 flex items-center gap-6 h-[60px]">
        
        {/* Left: Ministries Status HUD (Pills) */}
        <div className="flex-none bg-[#1a0f0f]/80 backdrop-blur-md border border-[#d4af37]/20 rounded-full px-4 py-2 shadow-lg flex items-center gap-4">
           <DepartmentDock />
        </div>

        {/* Center: The Royal Decree (Input Bar) */}
        <div className="flex-1 flex justify-center">
          <DecreePipeline />
        </div>

        {/* Right: System Status */}
        <div className="flex-none hidden md:flex items-center gap-2">
           <button 
             onClick={() => {
               useAgentStore.getState().setApprovalRequest({
                 agentId: 'minister',
                 toolCallId: 'test-123',
                 functionName: 'execute_decree',
                 args: { decree: 'Launch nuclear codes', reason: 'Testing' },
                 riskLevel: 'high'
               });
             }}
             className="px-2 py-1 text-xs bg-red-900/50 border border-red-500/50 rounded hover:bg-red-800/50"
           >
             Test Approval
           </button>
           <SystemStatus />
        </div>

      </div>
    </div>
  );
};

export default ConsoleLayout;
