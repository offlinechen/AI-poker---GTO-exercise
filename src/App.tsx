import { useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { GamePage } from './components/game/GamePage';
import { AnalysisPage } from './components/analysis/AnalysisPage';
import { SettingsPage } from './components/settings/SettingsPage';

type Page = 'home' | 'game' | 'analysis' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const { initializeGame, isGameStarted } = useGameStore();

  const handleStartGame = () => {
    if (!isGameStarted) {
      initializeGame();
    }
    setCurrentPage('game');
  };

  if (currentPage === 'game') {
    return <GamePage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'analysis') {
    return <AnalysisPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('home')} />;
  }

  // Home Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl text-green-500">🪙</span>
              <div>
                <h1 className="text-2xl font-bold text-white">德州扑克 GTO</h1>
                <p className="text-xs text-gray-400">Game Theory Optimal Learning Platform</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-6">
              <button
                onClick={() => setCurrentPage('home')}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                游戏大厅
              </button>
              <button
                onClick={() => setCurrentPage('analysis')}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                复盘分析
              </button>
              <button
                onClick={handleStartGame}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-all"
              >
                开始游戏
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 text-white">
              掌握 GTO 策略，成为扑克高手
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              通过AI对战、策略分析和数据复盘，系统化学习德州扑克博弈论最优解
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { icon: '♠️', title: '多人对战', desc: '支持2-9人桌，真实对局体验', color: 'text-blue-400' },
              { icon: '♥️', title: '智能AI', desc: '多级难度调节，模拟真实对手', color: 'text-red-400' },
              { icon: '♦️', title: 'GTO求解器', desc: '实时策略建议，优化决策', color: 'text-yellow-400' },
              { icon: '♣️', title: '复盘分析', desc: '详细数据统计，持续进步', color: 'text-green-400' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-green-500/50 transition-all cursor-pointer"
              >
                <div className={`text-5xl ${feature.color} mb-4`}>{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <button
              onClick={handleStartGame}
              className="bg-green-600 hover:bg-green-700 rounded-2xl p-8 transition-all group"
            >
              <div className="text-4xl mb-4 mx-auto group-hover:scale-110 transition-transform">▶️</div>
              <div className="text-xl font-bold">开始游戏</div>
            </button>

            <button
              onClick={() => setCurrentPage('analysis')}
              className="bg-gray-800 border-2 border-gray-700 hover:border-green-500 rounded-2xl p-8 transition-all group"
            >
              <div className="text-4xl mb-4 mx-auto group-hover:scale-110 transition-transform">📊</div>
              <div className="text-xl font-bold">复盘分析</div>
            </button>

            <button
              onClick={() => setCurrentPage('settings')}
              className="bg-gray-800 border-2 border-gray-700 hover:border-green-500 rounded-2xl p-8 transition-all group"
            >
              <div className="text-4xl mb-4 mx-auto group-hover:scale-110 transition-transform">⚙️</div>
              <div className="text-xl font-bold">游戏设置</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
