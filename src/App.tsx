import Sidebar from './components/Sidebar';
import GameContainer from './components/GameContainer';
import './App.css';

function App() {
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <Sidebar />
      <GameContainer />
    </div>
  );
}

export default App;
