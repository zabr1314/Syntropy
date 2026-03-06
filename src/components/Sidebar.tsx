import React, { useEffect } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { GameEventManager } from '../game/GameEventManager';
import { Play, Briefcase, AlertTriangle, Cpu, Users, FileText } from 'lucide-react';
import clsx from 'clsx';

const Sidebar: React.FC = () => {
  const { logs, metrics, setTargetPosition, setAgentStatus, addLog, updateMetrics } = useAgentStore();

  // 模拟系统监控数据波动
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

  const handleMoveMinister = () => {
    // Random position within safe area
    const x = Math.floor(Math.random() * 600) + 100;
    const y = Math.floor(Math.random() * 400) + 100;
    setTargetPosition('minister', x, y);
    addLog(`指令：移动 Minister 到 (${x}, ${y})`);
  };

  const handleWork = () => {
    // 移动到办公桌位置 (假设第一个办公桌在 200, 200)
    setTargetPosition('minister', 260, 230); // 椅子位置附近
    setAgentStatus('minister', 'working', '正在处理奏折...');
    addLog('指令：Minister 开始办公');
  };

  const handleError = () => {
    // 移动到天牢位置 (右上角)
    // 假设 Canvas 宽 800, 天牢在 width-150=650, y=50, w=100, h=100
    // 移动到中心点 700, 100
    setTargetPosition('minister', 700, 100);
    setAgentStatus('minister', 'error', '❌ 越权访问！');
    addLog('警报：检测到 Minister 越权操作，已押入天牢');
  };

  return (
    <div className="w-64 bg-gray-900 text-gray-200 flex flex-col h-full border-r border-gray-800 font-sans">
      <div className="p-4 border-b border-gray-800">
        <h1 className="font-bold text-lg text-white mb-1">天命系统控制台</h1>
        <div className="text-xs text-gray-500">Ver 1.0.0 (MVP)</div>
      </div>

      {/* 仪表盘 */}
      <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-800 bg-gray-800/30">
        <div className="col-span-2">
           <div className="flex justify-between text-xs text-gray-400 mb-1">
             <span className="flex items-center gap-1"><Cpu size={12}/> CPU 负载</span>
             <span className={clsx(
               "font-bold",
               metrics.cpu > 80 ? "text-red-400" : metrics.cpu > 50 ? "text-yellow-400" : "text-green-400"
             )}>{metrics.cpu.toFixed(1)}%</span>
           </div>
           <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
             <div 
               className={clsx(
                 "h-full transition-all duration-500",
                 metrics.cpu > 80 ? "bg-red-500" : metrics.cpu > 50 ? "bg-yellow-500" : "bg-green-500"
               )}
               style={{ width: `${metrics.cpu}%` }}
             />
           </div>
        </div>
        <div className="bg-gray-800 p-2 rounded flex flex-col items-center">
          <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1">
            <Users size={10} /> 在线
          </div>
          <div className="font-mono text-sm font-bold text-blue-300">{metrics.users}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded flex flex-col items-center">
          <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1">
            <FileText size={10} /> 工单
          </div>
          <div className="font-mono text-sm font-bold text-orange-300">{metrics.tickets}</div>
        </div>
      </div>
      
      {/* 控制面板 */}
      <div className="p-4 grid grid-cols-4 gap-2 border-b border-gray-800">
        <button
          onClick={handleMoveMinister}
          className="flex flex-col items-center justify-center p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors gap-1"
          title="随机移动"
        >
          <Play size={16} className="text-blue-400" />
          <span className="text-xs">移动</span>
        </button>
        <button
          onClick={handleWork}
          className="flex flex-col items-center justify-center p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors gap-1"
          title="开始工作"
        >
          <Briefcase size={16} className="text-green-400" />
          <span className="text-xs">办公</span>
        </button>
        <button
          onClick={handleError}
          className="flex flex-col items-center justify-center p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors gap-1"
          title="注入异常"
        >
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-xs">异常</span>
        </button>
        <button
          onClick={() => {
            GameEventManager.getInstance().triggerOverload();
          }}
          className="flex flex-col items-center justify-center p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors gap-1"
          title="触发过载"
        >
          <Cpu size={16} className="text-orange-500" />
          <span className="text-xs">过载</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
        {logs.slice().reverse().map((log) => (
          <div key={log.id} className="text-xs font-mono border-l-2 border-gray-700 pl-2 py-1">
            <span className="text-gray-500 block mb-0.5">[{log.time}]</span>
            <span className={log.message.includes('警报') ? 'text-red-400 font-bold' : 'text-gray-300'}>
              {log.message}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-600 text-xs italic text-center mt-4">系统就绪，等待指令...</div>
        )}
      </div>
      
      <div className="p-2 border-t border-gray-800 text-[10px] text-center text-gray-600">
        AI Empire Digital Hub &copy; 2024
      </div>
    </div>
  );
};

export default Sidebar;
