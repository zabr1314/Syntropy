import React from 'react';
import MemorialsPanel from '../Console/MemorialsPanel';
import OfficialsPanel from '../Console/OfficialsPanel';
import LogSidebar from '../Console/LogSidebar';
import ConsoleLayout from '../Console/ConsoleLayout';
import GameContainer from '../GameContainer';
import JailModal from '../JailModal';
import ApprovalModal from '../Console/ApprovalModal';
import PanelFrame from '../Console/PanelFrame';
import { ShieldCheck, Zap } from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';

const DashboardLayout: React.FC = () => {
  const wsConnected = useAgentStore(state => state.wsConnected);

  return (
    <div className="w-full h-screen bg-[#1a0f0f] text-white overflow-hidden flex flex-col relative">
      {/* Global Background Textures */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-40 mix-blend-soft-light" 
             style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")' }}>
        </div>
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-transparent via-[#1a0f0f]/50 to-[#1a0f0f]"></div>
      </div>

      {/* Main Content Grid - The Command Center */}
      <div className="relative z-10 flex-1 w-full h-full px-4 pt-4 grid grid-cols-12 gap-3 overflow-hidden">
        
        {/* Left Column: Officials (Roster) */}
        <div className="col-span-2 flex flex-col h-full overflow-hidden">
           <PanelFrame 
             title="百官录" 
             subtitle="MINISTRY ROSTER" 
             className="h-full"
             variant="secondary"
           >
             <OfficialsPanel variant="embedded" />
           </PanelFrame>
        </div>

        {/* Center Column: Game World */}
        <div className="col-span-7 flex flex-col h-full relative">
           {/* Game Container Frame */}
           <div className="absolute inset-0 rounded-lg overflow-hidden border-[3px] border-[#d4af37]/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black group">
              {/* Dragon Border Decoration (CSS-based) */}
              <div className="absolute inset-0 border-[2px] border-[#d4af37] opacity-80 z-20 pointer-events-none m-1"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-t-[4px] border-l-[4px] border-[#d4af37] z-20 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-[4px] border-r-[4px] border-[#d4af37] z-20 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[4px] border-l-[4px] border-[#d4af37] z-20 pointer-events-none"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[4px] border-r-[4px] border-[#d4af37] z-20 pointer-events-none"></div>

              {/* Game */}
              <GameContainer />

              {/* Overlays */}
              <JailModal />
              <ApprovalModal />
              
              {/* Title Overlay */}
              <div className="absolute top-6 left-6 pointer-events-none z-30">
                  <h1 className="text-3xl font-serif font-bold text-[#e6d5ac] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-[0.2em] leading-none">
                    太和殿
                  </h1>
                  <div className="flex items-center gap-2 mt-1 opacity-80">
                    <div className="h-px w-8 bg-[#d4af37]"></div>
                    <p className="text-[10px] font-mono text-[#d4af37] tracking-widest">SUPREME HARMONY HALL</p>
                  </div>
              </div>

              {/* Status Overlay */}
              <div className="absolute bottom-6 right-6 pointer-events-none z-30 flex items-center gap-4">
                 {/* WS Connection Status */}
                 <div className={`flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded border ${wsConnected ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <Zap size={12} className={wsConnected ? 'text-green-500' : 'text-red-500'} />
                    <span className={`text-[10px] font-mono tracking-wider ${wsConnected ? 'text-green-500' : 'text-red-500'}`}>
                      {wsConnected ? 'LIVE UPLINK: ONLINE' : 'LIVE UPLINK: OFFLINE'}
                    </span>
                 </div>

                 <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded border border-[#d4af37]/30">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-mono text-[#e6d5ac] tracking-wider">SYSTEM NORMAL</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column: Archives & Logs */}
        <div className="col-span-3 flex flex-col h-full gap-3 overflow-hidden">
           
           {/* Top: Memorials (Active Tasks) */}
           <div className="flex-[1.5] min-h-0">
             <PanelFrame 
               title="奏折阁" 
               subtitle="ARCHIVES" 
               className="h-full"
               variant="primary"
             >
               <MemorialsPanel variant="embedded" />
             </PanelFrame>
           </div>

           {/* Bottom: Logs (System Stream) */}
           <div className="flex-1 min-h-0">
             <PanelFrame 
               title="起居注" 
               subtitle="SYSTEM LOGS" 
               className="h-full"
               variant="glass"
               action={<ShieldCheck size={14} />}
             >
               <LogSidebar variant="embedded" />
             </PanelFrame>
           </div>

        </div>

      </div>

      {/* Footer / Console Dock */}
      <div className="relative z-20 flex-none">
        <ConsoleLayout />
      </div>
    </div>
  );
};

export default DashboardLayout;
