/**
 * Preflop GTO 范围数据
 * 基于常见GTO策略简化版本
 */

export type PreflopAction = 'fold' | 'call' | 'raise' | 'all-in';
export type Position = 'early' | 'middle' | 'late' | 'blinds';

// 手牌强度分级
export enum HandTier {
  PREMIUM = 5,    // AA, KK, QQ, AKs
  STRONG = 4,     // JJ, TT, AQs, AKo
  GOOD = 3,       // 99-77, AJs, AQo, KQs
  PLAYABLE = 2,   // 小对子, 同花连牌
  MARGINAL = 1,   // 弱牌
  TRASH = 0       // 垃圾牌
}

interface PreflopStrategy {
  tier: HandTier;
  earlyPosition: PreflopAction;
  middlePosition: PreflopAction;
  latePosition: PreflopAction;
  blindsPosition: PreflopAction;
  raiseSize?: number; // 加注大小（以BB为单位）
}

// 手牌等级映射表
export class PreflopRanges {
  // 评估手牌等级
  static getHandTier(card1Rank: string, card2Rank: string, suited: boolean): HandTier {
    const rankValues: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    const val1 = rankValues[card1Rank];
    const val2 = rankValues[card2Rank];
    const isPair = val1 === val2;
    const high = Math.max(val1, val2);
    const low = Math.min(val1, val2);
    const gap = high - low;

    // 顶级对子
    if (isPair && val1 >= 12) return HandTier.PREMIUM; // QQ+
    if (high === 14 && low === 13 && suited) return HandTier.PREMIUM; // AKs

    // 强牌
    if (isPair && val1 >= 10) return HandTier.STRONG; // JJ, TT
    if (high === 14 && low === 13) return HandTier.STRONG; // AKo
    if (high === 14 && low === 12 && suited) return HandTier.STRONG; // AQs

    // 好牌
    if (isPair && val1 >= 7) return HandTier.GOOD; // 99-77
    if (high === 14 && low >= 11) return HandTier.GOOD; // AJ+
    if (high === 13 && low === 12 && suited) return HandTier.GOOD; // KQs
    if (high === 13 && low >= 10 && suited) return HandTier.GOOD; // KJs, KTs
    if (high === 12 && low >= 10 && suited) return HandTier.GOOD; // QJs, QTs

    // 可玩牌
    if (isPair) return HandTier.PLAYABLE; // 小对子
    if (suited && gap <= 2 && high >= 9) return HandTier.PLAYABLE; // 同花连牌 (98s, 87s等)
    if (suited && gap <= 3 && high >= 10) return HandTier.PLAYABLE; // 同花准连牌 (T7s, J8s等)
    if (high >= 12 && low >= 10) return HandTier.PLAYABLE; // 高牌组合 (KQo, KJo, QJo等)

    // 边缘牌
    if (suited && gap <= 4 && high >= 9) return HandTier.MARGINAL; // 同花有gap (95s, T6s等)
    if (high >= 11 && low >= 8) return HandTier.MARGINAL; // J8+, Q8+等
    if (high === 14 && suited) return HandTier.MARGINAL; // 任何Ax同花

    return HandTier.TRASH;
  }

  // 根据位置和手牌等级获取GTO建议
  static getGTOAction(
    tier: HandTier,
    position: Position,
    facingRaise: boolean,
    potSize: number,
    bigBlind: number,
    isInBlind: boolean = false,
    callAmount: number = 0,
    bb: number = 0
  ): { action: PreflopAction; raiseSize?: number; confidence: number } {
    
    // **盲注位特殊处理：已投入筹码，底池赔率好**
    if (isInBlind && callAmount > 0) {
      const potOdds = callAmount / (potSize + callAmount);
      
      // 如果底池赔率很好（跟注金额小），放宽范围
      if (callAmount <= bb * 2) {
        // 面对小额加注，几乎所有牌都跟注
        if (tier >= HandTier.MARGINAL) {
          return { action: 'call', confidence: 0.70 };
        } else if (tier === HandTier.TRASH) {
          // 垃圾牌也考虑跟注
          return { action: 'call', confidence: 0.40 };
        }
      } else if (callAmount <= bb * 4) {
        // 面对中等加注，放宽范围
        if (tier >= HandTier.PLAYABLE) {
          return { action: 'call', confidence: 0.65 };
        } else if (tier === HandTier.MARGINAL) {
          return { action: 'call', confidence: 0.45 };
        }
      }
    }
    
    // 面对加注时的策略
    if (facingRaise) {
      return this.getFacingRaiseStrategy(tier, position);
    }

    // 开局策略（无人加注）
    return this.getOpeningStrategy(tier, position, bigBlind);
  }

  // 开局策略
  private static getOpeningStrategy(
    tier: HandTier,
    position: Position,
    bigBlind: number
  ): { action: PreflopAction; raiseSize?: number; confidence: number } {
    
    const strategies: Record<Position, Record<HandTier, { action: PreflopAction; raiseSize?: number; confidence: number }>> = {
      early: {
        [HandTier.PREMIUM]: { action: 'raise', raiseSize: 3, confidence: 0.95 },
        [HandTier.STRONG]: { action: 'raise', raiseSize: 2.5, confidence: 0.85 },
        [HandTier.GOOD]: { action: 'raise', raiseSize: 2.5, confidence: 0.70 },  // 从call改为raise
        [HandTier.PLAYABLE]: { action: 'call', confidence: 0.50 },  // 从fold改为call
        [HandTier.MARGINAL]: { action: 'call', confidence: 0.30 },  // 从fold改为call
        [HandTier.TRASH]: { action: 'fold', confidence: 0.15 }
      },
      middle: {
        [HandTier.PREMIUM]: { action: 'raise', raiseSize: 3, confidence: 0.95 },
        [HandTier.STRONG]: { action: 'raise', raiseSize: 2.5, confidence: 0.85 },
        [HandTier.GOOD]: { action: 'raise', raiseSize: 2.5, confidence: 0.75 },
        [HandTier.PLAYABLE]: { action: 'raise', raiseSize: 2, confidence: 0.60 },  // 从call改为raise
        [HandTier.MARGINAL]: { action: 'call', confidence: 0.40 },  // 从fold改为call
        [HandTier.TRASH]: { action: 'fold', confidence: 0.20 }
      },
      late: {
        [HandTier.PREMIUM]: { action: 'raise', raiseSize: 3, confidence: 0.95 },
        [HandTier.STRONG]: { action: 'raise', raiseSize: 2.5, confidence: 0.85 },
        [HandTier.GOOD]: { action: 'raise', raiseSize: 2.5, confidence: 0.80 },
        [HandTier.PLAYABLE]: { action: 'raise', raiseSize: 2, confidence: 0.65 },
        [HandTier.MARGINAL]: { action: 'raise', raiseSize: 2, confidence: 0.50 },  // 从call改为raise
        [HandTier.TRASH]: { action: 'call', confidence: 0.25 }  // 从fold改为call
      },
      blinds: {
        [HandTier.PREMIUM]: { action: 'raise', raiseSize: 3, confidence: 0.95 },
        [HandTier.STRONG]: { action: 'raise', raiseSize: 2.5, confidence: 0.85 },
        [HandTier.GOOD]: { action: 'raise', raiseSize: 2.5, confidence: 0.75 },  // 从call改为raise
        [HandTier.PLAYABLE]: { action: 'call', confidence: 0.55 },
        [HandTier.MARGINAL]: { action: 'call', confidence: 0.40 },  // 从fold改为call
        [HandTier.TRASH]: { action: 'fold', confidence: 0.20 }
      }
    };

    const strategy = strategies[position][tier];
    
    // 如果有加注大小，转换为实际筹码数
    if (strategy.raiseSize) {
      return {
        ...strategy,
        raiseSize: strategy.raiseSize * bigBlind
      };
    }

    return strategy;
  }

  // 面对加注的策略
  private static getFacingRaiseStrategy(
    tier: HandTier,
    position: Position
  ): { action: PreflopAction; raiseSize?: number; confidence: number } {
    
    // 面对加注时更松（大幅放宽）
    switch (tier) {
      case HandTier.PREMIUM:
        return { action: 'raise', confidence: 0.95 }; // 3-bet
      case HandTier.STRONG:
        return { action: 'call', confidence: 0.85 };  // 主要跟注
      case HandTier.GOOD:
        return { action: 'call', confidence: 0.75 };  // 提升信心值
      case HandTier.PLAYABLE:
        return { action: position === 'late' || position === 'blinds' ? 'call' : 'fold', confidence: 0.60 };  // 提升信心值
      case HandTier.MARGINAL:
        // 后位和盲注位都跟注
        if (position === 'late' || position === 'blinds') {
          return { action: 'call', confidence: 0.40 };
        }
        return { action: 'fold', confidence: 0.25 };
      default:
        // 垃圾牌在盲注位考虑跟注
        return { action: position === 'blinds' ? 'call' : 'fold', confidence: 0.2 };
    }
  }

  // 获取位置分类
  static getPositionType(playerPosition: number, totalPlayers: number, dealerIndex: number): Position {
    const relativePos = (playerPosition - dealerIndex + totalPlayers) % totalPlayers;
    
    // 根据相对位置分类
    if (relativePos <= 2) return 'early';      // UTG, UTG+1
    if (relativePos <= 4) return 'middle';     // MP, MP+1
    if (relativePos <= totalPlayers - 3) return 'late'; // CO, BTN
    return 'blinds';                            // SB, BB
  }
}
