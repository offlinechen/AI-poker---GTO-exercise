import { useState } from 'react';
import { motion } from 'framer-motion';
import { ActionType, Player } from '../../types';
import { ACTION_NAMES } from '../../constants';

interface ActionPanelProps {
  player: Player;
  availableActions: ActionType[];
  minRaise: number;
  maxBet: number;
  onAction: (action: ActionType, amount?: number) => void;
}

export function ActionPanel({ player, availableActions, minRaise, maxBet, onAction }: ActionPanelProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const handleAction = (action: ActionType) => {
    if (action === 'raise') {
      setShowRaiseSlider(true);
    } else {
      onAction(action, action === 'call' ? maxBet - player.bet : 0);
    }
  };

  const handleRaise = () => {
    onAction('raise', raiseAmount);
    setShowRaiseSlider(false);
  };

  const callAmount = maxBet - player.bet;
  const canCheck = player.bet === maxBet;

  const buttonVariants = {
    hover: { scale: 1.05, y: -2 },
    tap: { scale: 0.95 }
  };

  const getActionButton = (action: ActionType) => {
    const baseClass = "px-6 py-3 rounded-lg font-semibold text-sm transition-all shadow-lg";
    
    switch (action) {
      case 'fold':
        return (
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleAction('fold')}
            className={`${baseClass} bg-gradient-to-r from-error to-red-600 hover:shadow-error/50`}
          >
            {ACTION_NAMES.fold}
          </motion.button>
        );
      
      case 'check':
        return canCheck && (
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleAction('check')}
            className={`${baseClass} bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-blue-500/50`}
          >
            {ACTION_NAMES.check}
          </motion.button>
        );
      
      case 'call':
        return !canCheck && (
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleAction('call')}
            className={`${baseClass} bg-gradient-to-r from-primary to-primary-600 hover:shadow-primary/50`}
          >
            {ACTION_NAMES.call} ${callAmount}
          </motion.button>
        );
      
      case 'raise':
        return (
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleAction('raise')}
            className={`${baseClass} bg-gradient-to-r from-warning to-amber-600 hover:shadow-warning/50`}
          >
            {ACTION_NAMES.raise}
          </motion.button>
        );
      
      case 'all-in':
        return (
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleAction('all-in')}
            className={`${baseClass} bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-purple-500/50 border-2 border-purple-400`}
          >
            {ACTION_NAMES['all-in']} ${player.chips}
          </motion.button>
        );
      
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent backdrop-blur-md border-t border-white/10 p-6"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto max-w-4xl">
        {!showRaiseSlider ? (
          <div className="flex items-center justify-center gap-4">
            {availableActions.map(action => (
              <div key={action}>
                {getActionButton(action)}
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* 加注滑块 */}
            <div className="bg-background rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-muted">加注金额</span>
                <span className="text-2xl font-bold text-warning">${raiseAmount}</span>
              </div>
              
              <input
                type="range"
                min={minRaise}
                max={player.chips}
                step={minRaise}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-background-dark rounded-lg appearance-none cursor-pointer accent-warning"
              />
              
              <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>最小: ${minRaise}</span>
                <span>最大: ${player.chips}</span>
              </div>

              {/* 快捷金额按钮 */}
              <div className="flex gap-2 mt-4">
                {[
                  { label: '最小', value: minRaise },
                  { label: '1/2池', value: Math.min(Math.floor(maxBet / 2), player.chips) },
                  { label: '满池', value: Math.min(maxBet, player.chips) },
                  { label: 'All-in', value: player.chips },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setRaiseAmount(value)}
                    className="flex-1 px-3 py-2 bg-background-dark hover:bg-background text-xs rounded border border-white/10 hover:border-warning/50 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 确认/取消按钮 */}
            <div className="flex gap-4">
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setShowRaiseSlider(false)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg font-semibold text-sm shadow-lg"
              >
                取消
              </motion.button>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleRaise}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-warning to-amber-600 rounded-lg font-semibold text-sm shadow-lg hover:shadow-warning/50"
              >
                确认加注 ${raiseAmount}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* 玩家信息 */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-text-muted">
          <div>筹码: <span className="text-warning font-semibold">${player.chips}</span></div>
          <div>当前下注: <span className="text-primary font-semibold">${player.bet}</span></div>
        </div>
      </div>
    </motion.div>
  );
}
