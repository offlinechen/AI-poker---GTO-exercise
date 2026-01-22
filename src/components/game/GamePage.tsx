import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { PokerTable } from './PokerTable';
import { ActionPanel } from './ActionPanel';
import { GTOAssistant } from './GTOAssistant';
import { AIEngine } from '../../engine/ai/AIEngine';
import { PlayerAction } from '../../types';
import { DEFAULT_AI_SPEED } from '../../constants';

interface GamePageProps {
  onBack?: () => void;
}

export function GamePage({ onBack }: GamePageProps) {
  // 强制刷新标记
  const { gameState, engine, startNewHand, executePlayerAction, isGameStarted: storeGameStarted } = useGameStore();
  const [showGTOAssistant, setShowGTOAssistant] = useState(true);
  const [localGameStarted, setLocalGameStarted] = useState(false);
  const processingRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const executeActionRef = useRef(executePlayerAction);

  // 直接从 gameState 获取当前玩家
  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;

  // 保持 refs 最新
  useEffect(() => {
    gameStateRef.current = gameState;
    executeActionRef.current = executePlayerAction;
  }, [gameState, executePlayerAction]);

  // 初始化游戏逻辑
  useEffect(() => {
    // 如果本地还没标记为开始
    if (!localGameStarted) {
      // 检查当前游戏状态是否有效（是否已经发过牌）
      // 判断依据：是否有手牌
      const hasCards = gameState?.players.some(p => p.cards.length > 0);
      
      // 1. 如果 Store 里已经有游戏在进行，且已经发过牌，直接恢复
      if (storeGameStarted && gameState && hasCards) {
        console.log('[GamePage] Resuming existing game with cards');
        setLocalGameStarted(true);
        return;
      }

      // 2. 否则开始新游戏（即使 storeGameStarted 为 true，如果没有牌也重置）
      console.log('[GamePage] Starting initial hand (no valid active game found)');
      startNewHand();
      setLocalGameStarted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localGameStarted]); // 只依赖本地状态，确保只执行一次

  // 监听摊牌阶段
  useEffect(() => {
    if (gameState?.phase === 'showdown' && gameState.showdownResults) {
      processingRef.current = false;
    }
  }, [gameState?.phase, gameState?.showdownResults]);

  // 处理AI玩家的回合
  useEffect(() => {
    console.log('[GamePage] Effect triggered:', {
      hasGameState: !!gameState,
      hasCurrentPlayer: !!currentPlayer,
      currentPlayerId: currentPlayer?.id,
      currentPlayerName: currentPlayer?.name,
      currentPlayerType: currentPlayer?.type,
      currentPlayerStatus: currentPlayer?.status,
      phase: gameState?.phase,
      currentPlayerIndex: gameState?.currentPlayerIndex,
      processing: processingRef.current
    });

    if (!gameState || !currentPlayer) {
      console.log('[GamePage] Skipping - no gameState or currentPlayer');
      return;
    }
    
    if (gameState.phase === 'showdown') {
      console.log('[GamePage] Skipping - showdown phase');
      return;
    }

    // 检查当前玩家是否可以行动
    const canAct = currentPlayer.status === 'active' || currentPlayer.status === 'waiting';
    
    if (!canAct) {
      console.log('[GamePage] Current player cannot act:', currentPlayer.status);
      processingRef.current = false;
      return;
    }

    if (currentPlayer.type === 'ai' && !processingRef.current) {
      console.log('[GamePage] Starting AI processing for:', currentPlayer.name);
      processingRef.current = true;
      
      const timer = setTimeout(() => {
        const latestGameState = gameStateRef.current;
        const latestExecuteAction = executeActionRef.current;
        
        // 再次检查状态
        if (!latestGameState || latestGameState.phase === 'showdown') {
          console.log('[GamePage] AI processing cancelled - showdown or no state');
          processingRef.current = false;
          return;
        }

        console.log('[GamePage] Executing AI turn for player:', {
          id: currentPlayer.id,
          name: currentPlayer.name,
          status: currentPlayer.status,
          type: currentPlayer.type
        });
        
        AIEngine.processAITurns(latestGameState, (playerId, decision) => {
          console.log('[GamePage] AI decision received:', { playerId, decision });
          
          // 执行 AI 决策
          latestExecuteAction(playerId, {
            type: decision.action,
            amount: decision.amount,
            timestamp: Date.now()
          });
          
          // 无论成功或失败，都重置处理标志，防止卡住
          // 注意：如果失败，GameEngine 会保持状态不变，下次 Effect 会重新触发
          processingRef.current = false;
        });
      }, DEFAULT_AI_SPEED);

      return () => {
        clearTimeout(timer);
        // 如果组件卸载或依赖变化导致清理，必须重置处理状态，
        // 否则下一次 effect 执行时会误以为还在处理中
        processingRef.current = false;
      };
    } else if (currentPlayer.type === 'human') {
      console.log('[GamePage] Human player turn:', currentPlayer.name);
      processingRef.current = false;
    }
  }, [gameState?.currentPlayerIndex, gameState?.phase]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-darker via-background-dark to-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">加载游戏中...</div>
        </div>
      </div>
    );
  }

  const humanPlayer = gameState.players.find(p => p.type === 'human');
  
  // 调试日志：监控手牌状态
  useEffect(() => {
    if (humanPlayer) {
      console.log('[GamePage] Human player status:', {
        name: humanPlayer.name,
        status: humanPlayer.status,
        cardsCount: humanPlayer.cards.length,
        phase: gameState.phase,
        isDealer: humanPlayer.isDealer
      });
    }
  }, [gameState.phase, humanPlayer, gameState.currentPlayerIndex]);

  const isHumanTurn = currentPlayer?.type === 'human';
  const maxBet = Math.max(...gameState.players.map(p => p.bet), 0);

  const handleAction = (action: string, amount?: number) => {
    if (!humanPlayer || !isHumanTurn) return;

    const playerAction: PlayerAction = {
      type: action as any,
      amount: amount || 0,
      timestamp: Date.now()
    };

    executePlayerAction(humanPlayer.id, playerAction);
  };

  const availableActions = engine?.getAvailableActions(humanPlayer?.id || '') || [];

  const handleContinue = () => {
    processingRef.current = false; // 重置AI状态
    startNewHand();
  };

  const isShowdown = gameState.phase === 'showdown' && gameState.showdownResults;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-darker via-background-dark to-background">
      {/* 顶部工具栏 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <span>⬅️</span>
            <span>返回大厅</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-text-muted">
              小盲/大盲: <span className="text-warning font-semibold">${gameState.smallBlind}/${gameState.bigBlind}</span>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-xl">
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* 主游戏区域 */}
      <main className="pt-16 pb-32 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-7xl flex gap-6">
          {/* 扑克桌 */}
          <div className="flex-1">
            <PokerTable gameState={gameState} />
          </div>

          {/* GTO助手侧边栏 */}
          <AnimatePresence>
            {showGTOAssistant && humanPlayer && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-80"
              >
                <GTOAssistant player={humanPlayer} gameState={gameState} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 操作面板 */}
      {humanPlayer && isHumanTurn && humanPlayer.status === 'active' && (
        <ActionPanel
          player={humanPlayer}
          availableActions={availableActions}
          minRaise={gameState.minRaise}
          maxBet={maxBet}
          onAction={handleAction}
        />
      )}

      {/* GTO助手切换按钮 */}
      <button
        onClick={() => setShowGTOAssistant(!showGTOAssistant)}
        className="fixed right-4 top-20 z-40 px-4 py-2 bg-primary hover:bg-primary-600 rounded-lg shadow-lg transition-colors text-sm font-semibold"
      >
        {showGTOAssistant ? '隐藏助手' : '显示助手'}
      </button>

      {/* 结算后的继续按钮 */}
      {isShowdown && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ delay: 1, type: 'spring' }}
          onClick={handleContinue}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 px-8 py-4 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl font-bold text-lg shadow-2xl transition-all transform hover:scale-105"
        >
          继续下一局 →
        </motion.button>
      )}
    </div>
  );
}
