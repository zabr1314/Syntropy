import { useEffect } from 'react';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import { LiveAgentService } from './services/LiveAgentService';
import './App.css';

function App() {
  useEffect(() => {
    // 启动 WebSocket 服务
    const service = LiveAgentService.getInstance();
    service.start();

    // 暴露全局重置方法
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).resetSystem = () => {
        if (confirm('确定要清空所有奏折和状态吗？')) {
            localStorage.clear();
            window.location.reload();
        }
    };
    console.log('💡 Tip: 输入 window.resetSystem() 可重置系统数据');

    return () => {
      service.stop();
    };
  }, []);

  return (
    <DashboardLayout />
  );
}

export default App;
