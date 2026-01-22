import { useState, useEffect } from 'react';
import { db, StoredGame } from '../../services/database';
import { StatsService } from '../../services/statsService';
import { PlayerStats } from '../../types';
import { HandHistoryList } from './HandHistoryList';
import { StatsOverview } from './StatsOverview';

interface AnalysisPageProps {
  onBack?: () => void;
}

export function AnalysisPage({ onBack }: AnalysisPageProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');
  const [games, setGames] = useState<StoredGame[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const recentGames = await db.getRecentGames(50);
    setGames(recentGames);

    const stats = await StatsService.getPlayerStats('player-0');
    setPlayerStats(stats);
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-darker via-background-dark to-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">加载数据中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-darker via-background-dark to-background">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span>⬅️</span>
                <span>返回</span>
              </button>
              <h1 className="text-2xl font-bold">复盘分析</h1>
            </div>

            {/* Tab切换 */}
            <div className="flex gap-2 bg-background rounded-lg p-1">
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'history'
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span>📜</span>
                <span>历史记录</span>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span>📊</span>
                <span>数据统计</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-7xl">
          {activeTab === 'history' ? (
            <HandHistoryList games={games} onRefresh={loadData} />
          ) : (
            playerStats && <StatsOverview stats={playerStats} />
          )}
        </div>
      </main>
    </div>
  );
}
