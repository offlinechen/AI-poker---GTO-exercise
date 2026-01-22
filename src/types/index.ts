// 扑克牌花色
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// 扑克牌点数
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

// 扑克牌
export interface Card {
  suit: Suit;
  rank: Rank;
}

// 玩家类型
export type PlayerType = 'human' | 'ai';

// AI难度级别
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// 玩家动作类型
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

// 玩家动作
export interface PlayerAction {
  type: ActionType;
  amount: number;
  timestamp: number;
}

// 游戏阶段
export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// 玩家状态
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in' | 'out';

// 玩家信息
export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  difficulty?: AIDifficulty;
  aiStyle?: import('./aiStyle').AIStyle; // AI打法风格
  chips: number;
  bet: number;
  cards: Card[];
  status: PlayerStatus;
  position: number;
  hasActed: boolean; // 新增：是否已在当前回合行动
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  avatar?: string;
}

// 底池
export interface Pot {
  amount: number;
  eligiblePlayers: string[];
}

// 手牌评估结果
export interface HandEvaluation {
  rank: number;
  value: number;
  name: string; // 中文名称
  description: string; // 英文描述
  cards: Card[];
}

// 结算结果
export interface ShowdownResult {
  player: Player;
  hand: HandEvaluation;
  winAmount: number;
  isWinner: boolean;
}

// 游戏状态
export interface GameState {
  id: string;
  players: Player[];
  board: Card[];
  pots: Pot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  phase: GamePhase;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  lastRaise: number;
  deck: Card[];
  history: HandHistory[];
  showdownResults?: ShowdownResult[];
}

// 手牌历史记录
export interface HandHistory {
  id: string;
  timestamp: number;
  players: Player[];
  board: Card[];
  pots: Pot[];
  actions: Array<{
    playerId: string;
    action: PlayerAction;
    phase: GamePhase;
  }>;
  winners: Array<{
    playerId: string;
    amount: number;
    hand: string;
  }>;
}

// GTO策略
export interface GTOStrategy {
  action: ActionType;
  frequency: number;
  expectedValue: number;
  reasoning?: string;
}

// AI决策
export interface AIDecision {
  action: ActionType;
  amount: number;
  confidence: number;
  thinking?: string;
}

// 游戏配置
export interface GameConfig {
  playerCount: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  aiDifficulty: AIDifficulty;
}

// 统计数据
export interface PlayerStats {
  playerId: string;
  handsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  vpip: number; // Voluntarily Put money In Pot
  pfr: number;  // Pre-Flop Raise
  aggression: number;
  winRate: number;
}
