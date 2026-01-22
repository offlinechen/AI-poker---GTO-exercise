import { Suit, Rank } from '../types';

// 花色常量
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

// 点数常量
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// 点数对应的数值
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// 花色对应的符号
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

// 花色对应的颜色
export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#EF4444',
  diamonds: '#EF4444',
  clubs: '#1F2937',
  spades: '#1F2937'
};

// 默认游戏配置
export const DEFAULT_CONFIG = {
  playerCount: 6,
  startingChips: 1000,
  smallBlind: 5,
  bigBlind: 10,
  aiDifficulty: 'medium' as const
};

// AI行动速度配置（毫秒）
export const AI_SPEED_CONFIG = {
  instant: 100,      // 即时（100ms）
  fast: 300,         // 快速（300ms）
  normal: 600,       // 正常（600ms）
  slow: 1200         // 慢速（1200ms）
};

// 默认AI速度
export const DEFAULT_AI_SPEED = AI_SPEED_CONFIG.fast;

// AI难度配置
export const AI_DIFFICULTY_CONFIG = {
  easy: {
    bluffFrequency: 0.05,
    foldToBluffFrequency: 0.7,
    slowPlayFrequency: 0.1,
    gtoAdherence: 0.3
  },
  medium: {
    bluffFrequency: 0.15,
    foldToBluffFrequency: 0.5,
    slowPlayFrequency: 0.2,
    gtoAdherence: 0.6
  },
  hard: {
    bluffFrequency: 0.25,
    foldToBluffFrequency: 0.3,
    slowPlayFrequency: 0.3,
    gtoAdherence: 0.85
  },
  expert: {
    bluffFrequency: 0.3,
    foldToBluffFrequency: 0.2,
    slowPlayFrequency: 0.35,
    gtoAdherence: 0.95
  }
};

// 手牌等级名称
export const HAND_RANKS = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush'
];

// 动作名称映射
export const ACTION_NAMES = {
  fold: '弃牌',
  check: '过牌',
  call: '跟注',
  raise: '加注',
  'all-in': '全下'
};
