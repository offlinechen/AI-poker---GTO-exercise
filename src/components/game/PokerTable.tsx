import { motion } from 'framer-motion';
import { GameState } from '../../types';
import { PlayerSeat } from '../common/PlayerSeat';
import { PokerCard } from '../common/PokerCard';

interface PokerTableProps {
  gameState: GameState;
}

export function PokerTable({ gameState }: PokerTableProps) {
  const { players, board, pots, phase } = gameState;

  // 计算玩家座位位置（椭圆排列）
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index * 360 / total) - 90; // 从顶部开始
    const radiusX = 40; // 水平半径
    const radiusY = 35; // 垂直半径
    const x = 50 + radiusX * Math.cos(angle * Math.PI / 180);
    const y = 50 + radiusY * Math.sin(angle * Math.PI / 180);
    return { x, y };
  };

  // 计算总底池：底池金额 + 当前轮所有玩家的下注
  const potAmount = pots.reduce((sum, pot) => sum + pot.amount, 0);
  const currentBets = players.reduce((sum, p) => sum + p.bet, 0);
  const totalPot = potAmount + currentBets;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 扑克桌 */}
      <div className="relative w-full max-w-6xl aspect-[16/10]">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-green-900 rounded-[4rem] border-8 border-amber-900 shadow-2xl overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 桌面纹理 */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          {/* 内圈边框 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[70%] rounded-[50%] border-4 border-amber-700/50"></div>

          {/* 中央区域 - 公共牌和底池 */}
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
            
            {/* 摊牌阶段：显示结算面板（替代底池信息） */}
            {phase === 'showdown' && gameState.showdownResults ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="bg-gradient-to-r from-gray-900/95 to-black/95 backdrop-blur-md px-5 py-2.5 rounded-xl border border-yellow-500/30 shadow-2xl flex items-center gap-4 z-50 min-w-max"
              >
                {/* 获胜信息 */}
                {(() => {
                  const winners = gameState.showdownResults.filter(r => r.isWinner);
                  const totalWinnings = winners.reduce((sum, w) => sum + w.winAmount, 0);
                  
                  return (
                    <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <div className="text-sm font-bold text-white leading-tight">
                          {winners.length > 1 ? '平局' : winners[0]?.player.name}
                        </div>
                        <div className="text-xs text-yellow-500 font-bold">
                          赢取 ${totalWinnings}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 玩家收益列表 */}
                <div className="flex gap-2">
                  {gameState.showdownResults.map((result, index) => (
                    <div 
                      key={result.player.id}
                      className={`flex flex-col items-center px-2 py-1 rounded bg-white/5 min-w-[60px] ${
                        result.isWinner ? 'ring-1 ring-yellow-500/50 bg-yellow-500/10' : ''
                      }`}
                    >
                      <span className="text-[10px] text-gray-400 truncate max-w-[50px]">
                        {result.player.name}
                      </span>
                      <span className={`text-xs font-bold ${
                        result.isWinner ? 'text-yellow-500' : 'text-gray-500'
                      }`}>
                        {result.isWinner ? `+$${result.winAmount}` : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* 非摊牌阶段：显示底池 */
              <motion.div
                className="bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-yellow-600/30 flex items-center gap-3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                layout
              >
                <span className="text-xl text-yellow-500">🪙</span>
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Pot</span>
                  <span className="text-lg font-bold text-yellow-500">${totalPot}</span>
                </div>
              </motion.div>
            )}

            {/* 公共牌 */}
            {board.length > 0 && (
              <motion.div
                className="flex gap-2 mt-1"
                layout
              >
                {board.map((card, index) => (
                  <motion.div
                    key={index}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                  >
                    <PokerCard card={card} size="large" />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* 游戏阶段指示器（仅在非摊牌且有牌时显示） */}
            {phase !== 'showdown' && board.length > 0 && (
              <motion.div
                className="text-xs font-medium text-gray-400 bg-black/40 px-3 py-0.5 rounded-full border border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {phase === 'flop' && 'FLOP'}
                {phase === 'turn' && 'TURN'}
                {phase === 'river' && 'RIVER'}
              </motion.div>
            )}
          </div>

          {/* 玩家座位 */}
          {players.map((player, index) => {
            const position = getPlayerPosition(index, players.length);
            const isCurrentPlayer = index === gameState.currentPlayerIndex;
            const isHuman = player.type === 'human';

            return (
              <PlayerSeat
                key={player.id}
                player={player}
                isCurrentPlayer={isCurrentPlayer}
                showCards={isHuman || phase === 'showdown'}
                position={position}
              />
            );
          })}
        </motion.div>

        {/* 发光效果 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-transparent to-primary-600/20 blur-3xl"></div>
      </div>
    </div>
  );
}
