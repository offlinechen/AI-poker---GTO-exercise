import { create } from 'zustand';
import { GameState, Player, PlayerAction, GameConfig, GamePhase } from '../types';
import { GameEngine } from '../engine/game-logic/GameEngine';
import { DEFAULT_CONFIG } from '../constants';
import { db } from '../services/database';
import { StatsService } from '../services/statsService';

interface GameStore {
  engine: GameEngine | null;
  gameState: GameState | null;
  currentPlayer: Player | null;
  isGameStarted: boolean;
  
  // Actions
  initializeGame: (config?: Partial<GameConfig>) => void;
  startNewHand: () => void;
  executePlayerAction: (playerId: string, action: PlayerAction) => void;
  updateGameState: () => void;
  saveHandHistory: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  gameState: null,
  currentPlayer: null,
  isGameStarted: false,

  initializeGame: (config = {}) => {
    const fullConfig: GameConfig = { ...DEFAULT_CONFIG, ...config };
    const engine = new GameEngine(fullConfig);
    
    set({
      engine,
      gameState: engine.getState(),
      currentPlayer: engine.getCurrentPlayer(),
      isGameStarted: true,
    });
  },

  startNewHand: () => {
    const { engine } = get();
    if (!engine) return;

    console.log('[GameStore] Starting new hand');
    engine.startNewHand();
    const newState = engine.getState();
    const newCurrentPlayer = engine.getCurrentPlayer();
    
    console.log('[GameStore] New hand started:', {
      phase: newState.phase,
      currentPlayerIndex: newState.currentPlayerIndex,
      currentPlayer: newCurrentPlayer,
      players: newState.players.map(p => ({ id: p.id, name: p.name, status: p.status }))
    });
    
    set({
      gameState: newState,
      currentPlayer: newCurrentPlayer,
    });
  },

  executePlayerAction: (playerId: string, action: PlayerAction) => {
    const { engine } = get();
    if (!engine) return;

    console.log('[GameStore] Executing action:', playerId, action.type, action.amount);
    const success = engine.executeAction(playerId, action);
    console.log('[GameStore] Action success:', success);
    
    if (success) {
      const newState = engine.getState();
      const newCurrentPlayer = engine.getCurrentPlayer();
      
      console.log('[GameStore] After action:', {
        phase: newState.phase,
        currentPlayerIndex: newState.currentPlayerIndex,
        currentPlayer: newCurrentPlayer
      });
      
      set({
        gameState: newState,
        currentPlayer: newCurrentPlayer,
      });

      // 如果进入摊牌阶段，保存历史
      if (newState.phase === 'showdown' && newState.showdownResults) {
        console.log('[GameStore] Showdown detected, saving hand history');
        get().saveHandHistory();
      }
    }
  },

  updateGameState: () => {
    const { engine } = get();
    if (!engine) return;

    set({
      gameState: engine.getState(),
      currentPlayer: engine.getCurrentPlayer(),
    });
  },

  saveHandHistory: async () => {
    const { engine, gameState } = get();
    if (!engine || !gameState) return;

    try {
      const handHistory = engine.getCurrentHandHistory();
      if (!handHistory) {
        console.warn('[GameStore] No hand history available');
        return;
      }

      console.log('[GameStore] Saving hand history:', handHistory);

      // 保存到数据库
      const config: GameConfig = {
        playerCount: gameState.players.length,
        startingChips: DEFAULT_CONFIG.startingChips,
        smallBlind: gameState.smallBlind,
        bigBlind: gameState.bigBlind,
        aiDifficulty: DEFAULT_CONFIG.aiDifficulty
      };

      await db.saveGame(gameState.id, config, [handHistory]);
      
      // 更新统计数据
      await StatsService.updateStatsFromHand(handHistory);
      
      console.log('[GameStore] Hand history saved successfully');
    } catch (error) {
      console.error('[GameStore] Error saving hand history:', error);
    }
  },
}));
