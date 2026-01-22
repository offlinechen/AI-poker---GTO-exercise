import { motion, AnimatePresence } from 'framer-motion';
import { Player, HandEvaluation } from '../../types';
import { PokerCard } from '../common/PokerCard';

interface ShowdownResult {
  player: Player;
  hand: HandEvaluation;
  winAmount: number;
  isWinner: boolean;
}

interface ShowdownModalProps {
  results: ShowdownResult[];
  onContinue: () => void;
}

export function ShowdownModal({ results, onContinue }: ShowdownModalProps) {
  const winners = results.filter(r => r.isWinner);
  const totalWinnings = winners.reduce((sum, w) => sum + w.winAmount, 0);

  return (
    <AnimatePresence>
      {/* 半透明背景 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm cursor-pointer"
        onClick={onContinue}
      />
      
      {/* 居中结算面板 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-auto max-w-[90vw]"
      >
        <div className="bg-gradient-to-br from-background-dark/98 via-background-darker/98 to-background-dark/98 rounded-2xl px-6 py-5 border-2 border-primary/60 shadow-2xl">
          {/* 标题区域 */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="text-4xl"
              >
                🏆
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {winners.length > 1 ? '平局！' : `${winners[0]?.player.name} 获胜`}
                </h2>
                <p className="text-sm text-text-muted">
                  底池: <span className="text-primary font-bold text-base">${totalWinnings}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={onContinue}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              继续游戏
            </button>
          </div>

          {/* 玩家结果 - 横向排列 */}
          <div className="flex gap-4 items-start justify-center">
            {results.map((result, index) => (
              <motion.div
                key={result.player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08, type: 'spring' }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all min-w-[140px] ${
                  result.isWinner
                    ? 'bg-primary/20 border-primary shadow-lg shadow-primary/30'
                    : 'bg-background/40 border-white/10'
                }`}
              >
                {/* 玩家头像 */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  result.isWinner ? 'bg-primary/40 ring-2 ring-primary' : 'bg-background-dark/60'
                }`}>
                  {result.player.type === 'human' ? '👤' : '🤖'}
                </div>
                
                {/* 玩家名字 */}
                <div className="font-semibold text-white text-center">
                  {result.player.name}
                  {result.isWinner && ' 👑'}
                </div>

                {/* 手牌 - 正常大小 */}
                <div className="flex gap-1.5">
                  {result.player.cards.map((card, i) => (
                    <div key={i} className="transform scale-90">
                      <PokerCard card={card} size="small" />
                    </div>
                  ))}
                </div>

                {/* 牌型 */}
                <div className="text-sm text-text-muted font-medium text-center">
                  {result.hand.name}
                </div>

                {/* 收益 */}
                <div className="text-center mt-1">
                  {result.isWinner ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.08, type: 'spring' }}
                      className="text-xl font-bold text-primary"
                    >
                      +${result.winAmount}
                    </motion.div>
                  ) : (
                    <div className="text-base text-text-muted">—</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
