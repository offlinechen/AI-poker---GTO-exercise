import { useState } from 'react';
import { motion } from 'framer-motion';
import { AIDifficulty, GameConfig } from '../../types';
import { DEFAULT_CONFIG } from '../../constants';
import { useGameStore } from '../../stores/gameStore';
import { db } from '../../services/database';
import { StatsService } from '../../services/statsService';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { initializeGame, gameState } = useGameStore();
  const [config, setConfig] = useState<GameConfig>(() => {
    if (gameState) {
      // 尝试从当前游戏状态恢复配置
      return {
        playerCount: gameState.players.length,
        // 无法准确恢复初始筹码，因为游戏已经进行，这里使用默认值或者估算（取最大筹码？）
        // 为避免混淆，还是使用默认值，用户如果想改会自己拖动
        startingChips: DEFAULT_CONFIG.startingChips, 
        smallBlind: gameState.smallBlind,
        bigBlind: gameState.bigBlind,
        // 尝试获取第一个AI的难度
        aiDifficulty: gameState.players.find(p => p.type === 'ai')?.difficulty || DEFAULT_CONFIG.aiDifficulty
      };
    }
    return DEFAULT_CONFIG;
  });
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const updateConfig = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyConfig = () => {
    initializeGame(config);
    onBack();
  };

  const handleClearData = async () => {
    await db.clearAllGames();
    await StatsService.resetAllStats();
    setShowConfirmClear(false);
    alert('所有数据已清除');
  };

  const handleExportHistory = async () => {
    try {
      const games = await db.getAllGames();
      const stats = await db.getAllStats();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        games: games,
        stats: stats
      };
      
      // 创建 JSON 文件并下载
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `poker-history-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('历史记录已导出！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请查看控制台了解详情');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-darker via-background-dark to-background">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span>⬅️</span>
              <span>返回</span>
            </button>
            <h1 className="text-2xl font-bold">游戏设置</h1>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* 游戏配置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🎮</span>
              <h2 className="text-xl font-bold">游戏配置</h2>
            </div>

            <div className="space-y-6">
              {/* 玩家人数 */}
              <div>
                <label className="block text-sm font-medium mb-2">玩家人数</label>
                <select
                  value={config.playerCount}
                  onChange={(e) => updateConfig('playerCount', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:border-primary focus:outline-none transition-colors"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <option key={num} value={num}>{num}人桌</option>
                  ))}
                </select>
              </div>

              {/* 起始筹码 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  起始筹码: <span className="text-warning">${config.startingChips}</span>
                </label>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={config.startingChips}
                  onChange={(e) => updateConfig('startingChips', parseInt(e.target.value))}
                  className="w-full h-2 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>$500</span>
                  <span>$10,000</span>
                </div>
              </div>

              {/* 小盲注 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  小盲注: <span className="text-warning">${config.smallBlind}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={config.smallBlind}
                  onChange={(e) => updateConfig('smallBlind', parseInt(e.target.value))}
                  className="w-full h-2 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>$1</span>
                  <span>$100</span>
                </div>
              </div>

              {/* 大盲注 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  大盲注: <span className="text-warning">${config.bigBlind}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="200"
                  step="2"
                  value={config.bigBlind}
                  onChange={(e) => updateConfig('bigBlind', parseInt(e.target.value))}
                  className="w-full h-2 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>$2</span>
                  <span>$200</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI配置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-bold">AI 难度</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['easy', 'medium', 'hard', 'expert'] as AIDifficulty[]).map(difficulty => (
                <button
                  key={difficulty}
                  onClick={() => updateConfig('aiDifficulty', difficulty)}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    config.aiDifficulty === difficulty
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-background hover:bg-background-dark border border-white/10'
                  }`}
                >
                  {difficulty === 'easy' && '简单'}
                  {difficulty === 'medium' && '中等'}
                  {difficulty === 'hard' && '困难'}
                  {difficulty === 'expert' && '专家'}
                </button>
              ))}
            </div>

            <div className="mt-4 p-4 bg-background/50 rounded-lg border border-white/5 text-sm">
              <div className="font-semibold mb-2">难度说明:</div>
              <ul className="space-y-1 text-text-muted">
                <li>• 简单: AI策略基础，适合新手练习</li>
                <li>• 中等: AI会使用一些进阶技巧</li>
                <li>• 困难: AI接近真实玩家水平</li>
                <li>• 专家: AI高度遵循GTO策略</li>
              </ul>
            </div>
          </motion.div>

          {/* 数据管理 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">⚙️</span>
              <h2 className="text-xl font-bold">数据管理</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExportHistory}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-info hover:bg-blue-600 rounded-lg font-semibold transition-colors"
              >
                <span>📥</span>
                <span>导出历史记录</span>
              </button>

              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-error hover:bg-red-600 rounded-lg font-semibold transition-colors"
              >
                <span>🗑️</span>
                <span>清除所有数据</span>
              </button>

              <p className="text-xs text-text-muted text-center">
                导出历史记录为JSON文件，包含所有手牌历史和统计数据
              </p>
            </div>
          </motion.div>

          {/* 应用配置按钮 */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleApplyConfig}
            className="w-full px-8 py-4 bg-gradient-to-r from-primary to-primary-600 rounded-xl text-lg font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
          >
            应用配置
          </motion.button>
        </div>
      </main>

      {/* 确认清除对话框 */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background-dark rounded-2xl border border-white/10 p-6 max-w-md mx-4"
          >
            <h3 className="text-xl font-bold mb-4">确认清除数据？</h3>
            <p className="text-text-muted mb-6">
              此操作将永久删除所有游戏历史记录和统计数据，无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 px-6 py-3 bg-background hover:bg-background-darker rounded-lg font-semibold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 px-6 py-3 bg-error hover:bg-red-600 rounded-lg font-semibold transition-colors"
              >
                确认清除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
