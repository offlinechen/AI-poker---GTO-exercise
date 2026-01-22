import { motion } from 'framer-motion';
import { StoredGame } from '../../services/database';

interface HandHistoryListProps {
  games: StoredGame[];
  onRefresh: () => void;
}

export function HandHistoryList({ games, onRefresh }: HandHistoryListProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (games.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🃏</div>
        <div className="text-xl font-semibold mb-2">暂无游戏记录</div>
        <p className="text-text-muted">开始游戏后，历史记录将显示在这里</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">游戏历史</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-primary hover:bg-primary-600 rounded-lg transition-colors"
        >
          刷新
        </button>
      </div>

      <div className="grid gap-4">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6 hover:border-primary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-text-muted">🕒</span>
                  <span className="text-sm text-text-muted">
                    {formatDate(game.timestamp)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">👥</span>
                    <span className="text-sm">
                      {game.config.playerCount}人桌
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-warning">🪙</span>
                    <span className="text-sm">
                      盲注 ${game.config.smallBlind}/${game.config.bigBlind}
                    </span>
                  </div>
                  <div className="text-sm">
                    起始筹码: ${game.config.startingChips}
                  </div>
                </div>

                <div className="text-sm text-text-muted">
                  总手数: {game.history.length}
                </div>
              </div>

              <button className="px-4 py-2 bg-background hover:bg-background-dark rounded-lg text-sm transition-colors">
                查看详情
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
