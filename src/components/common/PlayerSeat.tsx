import { motion } from 'framer-motion';
import { Player } from '../../types';
import { PokerCard } from './PokerCard';
import { getStyleDisplayName } from '../../types/aiStyle';

interface PlayerSeatProps {
  player: Player;
  isCurrentPlayer?: boolean;
  showCards?: boolean;
  position: { x: number; y: number };
}

export function PlayerSeat({ player, isCurrentPlayer = false, showCards = false, position }: PlayerSeatProps) {
  const isActive = player.status === 'active' || player.status === 'waiting';
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';

  return (
    <div
      className="absolute"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <motion.div
        className={`relative ${isCurrentPlayer ? 'z-10' : 'z-0'}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 玩家信息卡片 */}
        <motion.div
          className={`bg-gradient-to-br from-background-dark to-background rounded-xl border-2 p-3 min-w-[140px] ${
            isCurrentPlayer ? 'border-primary shadow-lg shadow-primary/50' : 'border-white/20'
          } ${isFolded ? 'opacity-50' : ''}`}
          animate={isCurrentPlayer ? {
            boxShadow: ['0 0 20px rgba(16, 185, 129, 0.5)', '0 0 30px rgba(16, 185, 129, 0.8)', '0 0 20px rgba(16, 185, 129, 0.5)']
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {/* 状态指示器 */}
          {(player.isDealer || player.isSmallBlind || player.isBigBlind) && (
            <div className="absolute -top-2 -right-2 flex gap-1">
              {player.isDealer && (
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-amber-600">
                  D
                </div>
              )}
              {player.isSmallBlind && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-blue-600">
                  SB
                </div>
              )}
              {player.isBigBlind && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-red-600">
                  BB
                </div>
              )}
            </div>
          )}

          {/* 玩家头像 */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
              player.type === 'human' ? 'from-primary to-primary-600' : 'from-gray-500 to-gray-700'
            } flex items-center justify-center text-sm font-bold border-2 ${
              isActive ? 'border-white' : 'border-gray-600'
            }`}>
              {player.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{player.name}</div>
              {/* AI风格标签 */}
              {player.type === 'ai' && player.aiStyle && (
                <div className="text-[10px] text-text-muted mb-0.5">
                  {getStyleDisplayName(player.aiStyle)}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <span className="text-warning">🪙</span>
                <span>{player.chips}</span>
              </div>
            </div>
          </div>

          {/* 当前下注 */}
          {player.bet > 0 && (
            <motion.div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-warning/90 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              ${player.bet}
            </motion.div>
          )}

          {/* All-in 标记 */}
          {isAllIn && (
            <motion.div
              className="absolute -top-8 left-1/2 -translate-x-1/2 bg-error px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              ALL IN
            </motion.div>
          )}
        </motion.div>

        {/* 玩家手牌 */}
        {player.cards.length > 0 && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1">
            {player.cards.map((card, index) => (
              <PokerCard
                key={index}
                card={card}
                faceDown={!showCards && player.type === 'ai'}
                size="small"
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
