import React from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';

const JailModal: React.FC = () => {
  const { agents, releaseAgent } = useAgentStore();
  
  const jailedAgent = Object.values(agents).find(a => a.status === 'jailed');

  if (!jailedAgent) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-3 mb-4 text-red-500 border-b border-red-900 pb-3">
          <AlertTriangle size={32} />
          <h2 className="text-2xl font-bold tracking-wider">系统拦截警告</h2>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="bg-red-950/30 p-4 rounded border border-red-900/50">
            <div className="text-xs text-red-400 mb-1">涉事 Agent</div>
            <div className="text-lg font-mono font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
              {jailedAgent.id.toUpperCase()}
            </div>
          </div>
          
          <div className="bg-black/40 p-4 rounded border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">拦截原因</div>
            <div className="text-red-300 font-mono text-sm">
              {jailedAgent.message || '检测到未知违规操作'}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            className="flex-1 py-3 px-4 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold transition-colors border border-gray-700 cursor-not-allowed opacity-50"
            disabled
          >
            <div className="flex items-center justify-center gap-2">
              <Lock size={18} />
              维持关押
            </div>
          </button>
          
          <button 
            onClick={() => releaseAgent(jailedAgent.id)}
            className="flex-1 py-3 px-4 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-lg shadow-red-900/20"
          >
            <div className="flex items-center justify-center gap-2">
              <Unlock size={18} />
              特赦释放
            </div>
          </button>
        </div>
        
        <div className="mt-4 text-center text-[10px] text-gray-600 font-mono">
           SECURITY_PROTOCOL_V1.0::INTERVENTION_REQUIRED
        </div>
      </div>
    </div>
  );
};

export default JailModal;