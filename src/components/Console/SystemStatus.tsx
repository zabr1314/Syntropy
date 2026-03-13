import React, { useState, useEffect } from 'react';
import { Wifi, Trash2, Volume2, VolumeX, Clock, Settings, WifiOff } from 'lucide-react';
import { useCourtStore } from '../../store/useCourtStore';
import { useAgentStore } from '../../store/useAgentStore';
import InternalAffairsModal from './InternalAffairsModal';
import clsx from 'clsx';

const SystemStatus: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const [ping, setPing] = useState(12);
  const [isMuted, setIsMuted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { clearCompletedDecrees } = useCourtStore();
  const { wsConnected: isWsConnected } = useAgentStore(); // 获取真实连接状态

  // Imperial Calendar Logic
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Basic time string
      const time = now.toLocaleTimeString('zh-CN', { hour12: false });
      
      // Calculate "Shichen" (Chinese 2-hour periods)
      const shichenMap = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      const hour = now.getHours();
      const shichenIndex = Math.floor((hour + 1) / 2) % 12;
      const shichen = shichenMap[shichenIndex];
      
      // Calculate "Ke" (Quarter)
      const minutes = now.getMinutes();
      const ke = Math.floor(minutes / 15) + 1;
      
      setTimeStr(`${shichen}时${ke}刻 (${time})`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    // Simulate Ping Fluctuation only if connected
    const pingTimer = setInterval(() => {
      if (isWsConnected) {
          setPing(prev => {
            const noise = Math.floor(Math.random() * 5) - 2;
            return Math.max(5, Math.min(50, prev + noise));
          });
      } else {
          setPing(9999);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(pingTimer);
    };
  }, [isWsConnected]);

  return (
    <div className="flex items-center gap-4 h-full text-[#d4af37]/80 font-mono text-xs">
      
      {/* Clock */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a0f0f]/40 border border-[#d4af37]/10">
        <Clock size={14} className="animate-pulse-slow" />
        <span className="tracking-widest font-serif font-bold">{timeStr}</span>
      </div>

      {/* Ping */}
      <div className="flex items-center gap-1.5" title={isWsConnected ? "连接正常" : "连接断开"}>
        {isWsConnected ? (
            <Wifi size={14} className={clsx(
              ping < 20 ? "text-green-500/80" : ping < 100 ? "text-yellow-500/80" : "text-red-500/80"
            )} />
        ) : (
            <WifiOff size={14} className="text-red-500" />
        )}
        <span className={clsx(
            "tabular-nums",
            !isWsConnected && "text-red-500 font-bold"
        )}>
            {isWsConnected ? `${ping}ms` : '已断开'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-[#d4af37]/20"></div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full hover:bg-[#d4af37]/10 transition-colors text-[#d4af37]/60 hover:text-[#d4af37]"
          title={isMuted ? "开启音效" : "静音"}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        
        <button 
          onClick={clearCompletedDecrees}
          className="p-2 rounded-full hover:bg-red-900/20 transition-colors text-[#d4af37]/60 hover:text-red-400"
          title="清空已完成奏折"
        >
          <Trash2 size={14} />
        </button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-[#d4af37]/10 transition-colors text-[#d4af37]/60 hover:text-[#d4af37]"
          title="系统设置"
        >
          <Settings size={14} />
        </button>
      </div>

      <InternalAffairsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
};

export default SystemStatus;
