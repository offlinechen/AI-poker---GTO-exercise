import { motion } from 'framer-motion';
import { Player, GameState } from '../../types';
import { GTOSolver } from '../../engine/gto/GTOSolver';
import { ACTION_NAMES } from '../../constants';

interface GTOAssistantProps {
  player: Player;
  gameState: GameState;
}

export function GTOAssistant({ player, gameState }: GTOAssistantProps) {
  const strategies = GTOSolver.getStrategy(player, gameState);
  const recommended = strategies[0];

  return (
    <motion.div
      className="bg-gradient-to-br from-background-dark to-background rounded-2xl border border-white/10 p-6 shadow-2xl h-full overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/20 rounded-lg text-2xl">
          🧠
        </div>
        <div>
          <h3 className="text-lg font-bold">GTO 策略助手</h3>
          <p className="text-xs text-text-muted">基于博弈论最优解</p>
        </div>
      </div>

      {/* 推荐动作 */}
      {recommended && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-warning text-lg">💡</span>
            <span className="text-sm font-semibold text-text-muted">推荐动作</span>
          </div>
          <div className="text-2xl font-bold text-primary mb-2">
            {ACTION_NAMES[recommended.action as keyof typeof ACTION_NAMES]}
          </div>
          <div className="text-xs text-text-secondary mb-3">
            {recommended.reasoning}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">频率</span>
            <span className="font-semibold">{Math.round(recommended.frequency * 100)}%</span>
          </div>
          <div className="w-full bg-background-dark rounded-full h-2 mt-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${recommended.frequency * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>
      )}

      {/* 所有策略选项 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-info text-lg">📈</span>
          <span className="text-sm font-semibold">策略分布</span>
        </div>
        <div className="space-y-3">
          {strategies.map((strategy, index) => (
            <motion.div
              key={index}
              className="p-3 bg-background/50 rounded-lg border border-white/5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {ACTION_NAMES[strategy.action as keyof typeof ACTION_NAMES]}
                </span>
                <span className={`text-sm font-semibold ${
                  strategy.expectedValue > 0 ? 'text-primary' : 'text-error'
                }`}>
                  EV: {strategy.expectedValue > 0 ? '+' : ''}{Math.round(strategy.expectedValue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background-dark rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-600 h-1.5 rounded-full"
                    style={{ width: `${strategy.frequency * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted w-12 text-right">
                  {Math.round(strategy.frequency * 100)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 手牌分析 */}
      <div className="p-4 bg-background/50 rounded-lg border border-white/5">
        <h4 className="text-sm font-semibold mb-3">当前局势</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">游戏阶段</span>
            <span className="font-medium">
              {gameState.phase === 'preflop' && '翻牌前'}
              {gameState.phase === 'flop' && '翻牌圈'}
              {gameState.phase === 'turn' && '转牌圈'}
              {gameState.phase === 'river' && '河牌圈'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">底池大小</span>
            <span className="font-medium text-warning">
              ${gameState.pots.reduce((sum, p) => sum + p.amount, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">活跃玩家</span>
            <span className="font-medium">
              {gameState.players.filter(p => p.status === 'active').length}人
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">你的位置</span>
            <span className="font-medium">
              {player.isDealer && '庄家'}
              {player.isSmallBlind && '小盲'}
              {player.isBigBlind && '大盲'}
              {!player.isDealer && !player.isSmallBlind && !player.isBigBlind && `位置${player.position + 1}`}
            </span>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-6 p-3 bg-info/10 border border-info/30 rounded-lg">
        <p className="text-xs text-text-muted">
          💡 GTO策略提供混合策略建议，实际决策可根据对手特点调整
        </p>
      </div>
    </motion.div>
  );
}
