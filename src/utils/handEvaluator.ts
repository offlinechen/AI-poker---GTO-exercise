import { Card, Rank } from '../types';
import { RANK_VALUES } from '../constants';

// 手牌等级
export enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9
}

// 手牌评估结果
export interface HandEvaluation {
  rank: HandRank;
  value: number;
  description: string;
  name: string; // 中文名称
  cards: Card[];
  draws?: {
    flushDraw: boolean;
    straightDraw: boolean;
    gutshot: boolean;
    backdoorFlush: boolean;
    outs: number;
  };
}

// 手牌名称
export const HAND_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: '高牌',
  [HandRank.OnePair]: '一对',
  [HandRank.TwoPair]: '两对',
  [HandRank.ThreeOfAKind]: '三条',
  [HandRank.Straight]: '顺子',
  [HandRank.Flush]: '同花',
  [HandRank.FullHouse]: '葫芦',
  [HandRank.FourOfAKind]: '四条',
  [HandRank.StraightFlush]: '同花顺',
  [HandRank.RoyalFlush]: '皇家同花顺'
};

// 检测听牌
export function detectDraws(cards: Card[]): {
  flushDraw: boolean;
  straightDraw: boolean;
  gutshot: boolean;
  backdoorFlush: boolean;
  outs: number;
} {
  const suits: Record<string, number> = {};
  const ranks = new Set<number>();
  
  cards.forEach(card => {
    suits[card.suit] = (suits[card.suit] || 0) + 1;
    ranks.add(RANK_VALUES[card.rank]);
  });

  // 同花听牌检测
  let flushDraw = false;
  let backdoorFlush = false;
  let flushOuts = 0;

  Object.values(suits).forEach(count => {
    if (count === 4) {
      flushDraw = true;
      flushOuts = 9;
    } else if (count === 3) {
      backdoorFlush = true;
      flushOuts = 1.5; // 后门花折算权益
    }
  });

  // 顺子听牌检测
  const uniqueRanks = Array.from(ranks).sort((a, b) => a - b);
  // 处理A的特殊情况 (A=14, A=1)
  if (uniqueRanks.includes(14)) uniqueRanks.unshift(1);

  let straightOuts = 0;
  let straightDraw = false;
  let gutshot = false;

  // 检查顺子听牌
  for (let i = 0; i <= uniqueRanks.length - 4; i++) {
    const window = uniqueRanks.slice(i, i + 4);
    const span = window[window.length - 1] - window[0];
    
    // 如果4张牌跨度为3 (例如 5,6,7,8)，则是两头顺
    // 如果4张牌跨度为4 (例如 5,6,8,9)，则是卡顺
    if (span <= 4) {
      const distinctCount = new Set(window).size;
      if (distinctCount === 4) {
        if (span === 3) { // 连续4张
          straightDraw = true;
          straightOuts = Math.max(straightOuts, 8);
        } else if (span === 4) { // 中间缺1张
          gutshot = true;
          straightOuts = Math.max(straightOuts, 4);
        }
      }
    }
  }

  // 检查3张牌的顺子兆头（后门顺），通常忽略，除非很强
  
  return {
    flushDraw,
    straightDraw,
    gutshot,
    backdoorFlush,
    outs: flushOuts + straightOuts
  };
}

// 评估手牌
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    // 少于5张牌时，返回高牌
    const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const draws = detectDraws(cards);
    
    return {
      rank: HandRank.HighCard,
      value: RANK_VALUES[sorted[0]?.rank || 'A'],
      description: 'High Card',
      name: HAND_NAMES[HandRank.HighCard],
      cards: sorted,
      draws
    };
  }

  // 生成所有5张牌的组合
  const combinations = getCombinations(cards, 5);
  
  // 评估每个组合，找到最好的
  let bestHand = evaluateFiveCards(combinations[0]);
  for (let i = 1; i < combinations.length; i++) {
    const currentHand = evaluateFiveCards(combinations[i]);
    if (compareHands(currentHand, bestHand) > 0) {
      bestHand = currentHand;
    }
  }
  
  // 添加听牌信息
  const draws = detectDraws(cards);
  
  return {
    ...bestHand,
    draws
  };
}

// 评估5张牌
function evaluateFiveCards(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  
  const isFlush = checkFlush(sorted);
  const isStraight = checkStraight(sorted);
  const rankCounts = getRankCounts(sorted);

  // 同花顺
  if (isFlush && isStraight) {
    const isRoyal = sorted[0].rank === 'A' && sorted[1].rank === 'K';
    if (isRoyal) {
      return {
        rank: HandRank.RoyalFlush,
        value: 10000000,
        description: 'Royal Flush',
        name: HAND_NAMES[HandRank.RoyalFlush],
        cards: sorted
      };
    }
    return {
      rank: HandRank.StraightFlush,
      value: 9000000 + RANK_VALUES[sorted[0].rank],
      description: 'Straight Flush',
      name: HAND_NAMES[HandRank.StraightFlush],
      cards: sorted
    };
  }

  // 四条
  if (rankCounts[0].count === 4) {
    return {
      rank: HandRank.FourOfAKind,
      value: 8000000 + rankCounts[0].value * 1000 + rankCounts[1].value,
      description: 'Four of a Kind',
      name: HAND_NAMES[HandRank.FourOfAKind],
      cards: sorted
    };
  }

  // 葫芦
  if (rankCounts[0].count === 3 && rankCounts[1].count === 2) {
    return {
      rank: HandRank.FullHouse,
      value: 7000000 + rankCounts[0].value * 1000 + rankCounts[1].value,
      description: 'Full House',
      name: HAND_NAMES[HandRank.FullHouse],
      cards: sorted
    };
  }

  // 同花
  if (isFlush) {
    let value = 6000000;
    sorted.forEach((card, i) => {
      value += RANK_VALUES[card.rank] * Math.pow(100, 4 - i);
    });
    return {
      rank: HandRank.Flush,
      value,
      description: 'Flush',
      name: HAND_NAMES[HandRank.Flush],
      cards: sorted
    };
  }

  // 顺子
  if (isStraight) {
    return {
      rank: HandRank.Straight,
      value: 5000000 + RANK_VALUES[sorted[0].rank],
      description: 'Straight',
      name: HAND_NAMES[HandRank.Straight],
      cards: sorted
    };
  }

  // 三条
  if (rankCounts[0].count === 3) {
    return {
      rank: HandRank.ThreeOfAKind,
      value: 4000000 + rankCounts[0].value * 10000 + rankCounts[1].value * 100 + rankCounts[2].value,
      description: 'Three of a Kind',
      name: HAND_NAMES[HandRank.ThreeOfAKind],
      cards: sorted
    };
  }

  // 两对
  if (rankCounts[0].count === 2 && rankCounts[1].count === 2) {
    return {
      rank: HandRank.TwoPair,
      value: 3000000 + rankCounts[0].value * 10000 + rankCounts[1].value * 100 + rankCounts[2].value,
      description: 'Two Pair',
      name: HAND_NAMES[HandRank.TwoPair],
      cards: sorted
    };
  }

  // 一对
  if (rankCounts[0].count === 2) {
    return {
      rank: HandRank.OnePair,
      value: 2000000 + rankCounts[0].value * 10000 + rankCounts[1].value * 100 + rankCounts[2].value,
      description: 'One Pair',
      name: HAND_NAMES[HandRank.OnePair],
      cards: sorted
    };
  }

  // 高牌
  let value = 1000000;
  sorted.forEach((card, i) => {
    value += RANK_VALUES[card.rank] * Math.pow(100, 4 - i);
  });
  return {
    rank: HandRank.HighCard,
    value,
    description: 'High Card',
    name: HAND_NAMES[HandRank.HighCard],
    cards: sorted
  };
}

// 检查是否为同花
function checkFlush(cards: Card[]): boolean {
  return cards.every(card => card.suit === cards[0].suit);
}

// 检查是否为顺子
function checkStraight(cards: Card[]): boolean {
  const values = cards.map(card => RANK_VALUES[card.rank]).sort((a, b) => b - a);
  
  // 普通顺子
  let isStraight = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isStraight = false;
      break;
    }
  }
  
  // A-2-3-4-5特殊顺子
  if (!isStraight && values[0] === 14) {
    const lowAce = [5, 4, 3, 2, 1];
    isStraight = values.slice(1).every((v, i) => v === lowAce[i]);
  }
  
  return isStraight;
}

// 获取点数计数
function getRankCounts(cards: Card[]): Array<{ value: number, count: number }> {
  const counts: Record<number, number> = {};
  cards.forEach(card => {
    const value = RANK_VALUES[card.rank];
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([value, count]) => ({ value: parseInt(value), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.value - a.value;
    });
}

// 获取组合
function getCombinations(arr: Card[], size: number): Card[][] {
  if (size > arr.length) return [];
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(item => [item]);

  const result: Card[][] = [];
  for (let i = 0; i < arr.length - size + 1; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), size - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }
  return result;
}

// 比较两手牌
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  return hand1.value - hand2.value;
}

// 获取手牌描述
export function getHandDescription(hand: HandEvaluation): string {
  return hand.description;
}
