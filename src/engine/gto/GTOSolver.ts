import { Player, GameState, GTOStrategy, Card, ActionType } from '../../types';
import { evaluateHand, HandRank } from '../../utils/handEvaluator';
import { PreflopRanges } from '../ai/PreflopRanges';

export class GTOSolver {
  // 获取GTO策略建议
  static getStrategy(player: Player, gameState: GameState): GTOStrategy[] {
    // Preflop 阶段使用 PreflopRanges 的专业建议
    if (gameState.phase === 'preflop') {
      return this.getPreflopStrategy(player, gameState);
    }

    const handStrength = this.calculateHandStrength(player.cards, gameState.board);
    const potOdds = this.calculatePotOdds(gameState);
    const equity = this.calculateEquity(player.cards, gameState.board, gameState.players.length);
    const position = this.getPositionValue(player.position, gameState.players.length);

    const strategies: GTOStrategy[] = [];

    // 计算各种动作的期望值
    const foldEV = 0;
    const checkCallEV = this.calculateCheckCallEV(equity, potOdds, gameState);
    const raiseEV = this.calculateRaiseEV(equity, handStrength, position, gameState);

    // 基于期望值生成策略频率
    const totalEV = Math.max(checkCallEV, 0) + Math.max(raiseEV, 0) + Math.max(foldEV, 0);

    if (totalEV === 0) {
      strategies.push({
        action: 'fold',
        frequency: 1.0,
        expectedValue: 0,
        reasoning: '当前无利可图，建议弃牌'
      });
      return strategies;
    }

    // 弃牌策略
    if (checkCallEV < 0 && raiseEV < 0) {
      strategies.push({
        action: 'fold',
        frequency: 1.0,
        expectedValue: foldEV,
        reasoning: '手牌弱，期望值为负，应该弃牌'
      });
    } else {
      const maxBet = Math.max(...gameState.players.map(p => p.bet), 0);
      const needCall = maxBet > player.bet;

      // 过牌/跟注策略
      if (checkCallEV > 0) {
        const freq = Math.max(checkCallEV / totalEV, 0.2);
        strategies.push({
          action: needCall ? 'call' : 'check',
          frequency: Math.min(freq, 1),
          expectedValue: checkCallEV,
          reasoning: this.generateReasoning(needCall ? 'call' : 'check', equity, potOdds, position, gameState.phase)
        });
      }

      // 加注策略
      if (raiseEV > 0) {
        const freq = Math.max(raiseEV / totalEV, 0.1);
        strategies.push({
          action: 'raise',
          frequency: Math.min(freq, 0.8),
          expectedValue: raiseEV,
          reasoning: this.generateReasoning('raise', equity, potOdds, position, gameState.phase)
        });
      }

      // 诈唬策略（基于GTO混合策略）
      if (handStrength < 0.4 && position > 0.5) {
        const bluffFreq = this.calculateOptimalBluffFrequency(gameState);
        if (bluffFreq > 0) {
          strategies.push({
            action: 'raise',
            frequency: bluffFreq,
            expectedValue: raiseEV * 0.5,
            reasoning: '位置优势配合诈唬，可以偷取底池'
          });
        }
      }
    }

    // 归一化频率
    const totalFreq = strategies.reduce((sum, s) => sum + s.frequency, 0);
    if (totalFreq > 1) {
      strategies.forEach(s => s.frequency /= totalFreq);
    }

    return strategies.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  // Preflop 专用策略（使用 PreflopRanges）
  private static getPreflopStrategy(player: Player, gameState: GameState): GTOStrategy[] {
    // 安全检查：确保玩家有两张手牌
    if (!player.cards || player.cards.length < 2) {
      return [{
        action: 'fold',
        frequency: 1.0,
        expectedValue: 0,
        reasoning: '无手牌信息，建议弃牌'
      }];
    }

    const [card1, card2] = player.cards;
    const suited = card1.suit === card2.suit;
    
    // 获取手牌等级
    const tier = PreflopRanges.getHandTier(card1.rank, card2.rank, suited);
    
    // 获取位置
    const position = PreflopRanges.getPositionType(
      player.position,
      gameState.players.length,
      gameState.dealerIndex
    );
    
    // 检查是否面对加注
    const maxBet = Math.max(...gameState.players.map(p => p.bet), 0);
    const facingRaise = maxBet > gameState.bigBlind;
    const isInBlind = player.bet > 0;
    const callAmount = maxBet - player.bet;
    
    // 获取 GTO 建议
    const gtoSuggestion = PreflopRanges.getGTOAction(
      tier,
      position,
      facingRaise,
      gameState.pots.reduce((sum, pot) => sum + pot.amount, 0),
      gameState.bigBlind,
      isInBlind,
      callAmount,
      gameState.bigBlind
    );

    const strategies: GTOStrategy[] = [];
    const pot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);

    // 计算手牌权益（使用 tier 作为近似）
    const equity = this.tierToEquity(tier);
    
    // 计算跟注 EV：EV = (赢率 × 底池) - (输率 × 跟注额)
    const callEV = callAmount > 0 
      ? equity * pot - (1 - equity) * callAmount
      : pot * equity * 0.3; // 免费过牌的价值
    
    // 计算加注 EV（Preflop 专用，考虑多人底池）
    const raiseAmount = gtoSuggestion.raiseSize || gameState.bigBlind * 2.5;
    
    // Preflop 对手弃牌率应该更高（基于 confidence 和 tier）
    // 强牌：50-70% 弃牌率；好牌：40-60%；中等：30-50%
    const baseFoldEquity = tier >= 4 ? 0.6 : tier >= 3 ? 0.5 : 0.4;
    const foldEquity = Math.min(0.8, baseFoldEquity + gtoSuggestion.confidence * 0.2);
    
    // 活跃玩家数（估算）
    const activePlayers = Math.max(2, gameState.players.filter(p => p.status === 'active').length);
    
    // 多人底池：每增加一个对手，弃牌率下降
    const adjustedFoldEquity = foldEquity * Math.pow(0.85, activePlayers - 2);
    
    // 加注 EV 计算：
    // 场景1：所有对手弃牌 -> 赢得底池
    // 场景2：至少一人跟注 -> 进入摊牌（考虑我们的权益）
    // 投入成本：raiseAmount
    const raiseEV = adjustedFoldEquity * pot + (1 - adjustedFoldEquity) * (equity * (pot + raiseAmount * (activePlayers - 1)) - raiseAmount);

    // 根据建议生成策略
    if (gtoSuggestion.action === 'fold') {
      strategies.push({
        action: 'fold',
        frequency: 1.0,
        expectedValue: 0,
        reasoning: '当前牌力不足，建议弃牌'
      });
    } else if (gtoSuggestion.action === 'call') {
      // 给出跟注和弃牌两个选项
      strategies.push({
        action: 'call',
        frequency: gtoSuggestion.confidence,
        expectedValue: callEV, // 保留真实 EV，包括负值
        reasoning: this.getPreflopReasoning('call', tier, position, facingRaise)
      });
      strategies.push({
        action: 'fold',
        frequency: 1 - gtoSuggestion.confidence,
        expectedValue: 0,
        reasoning: '也可以选择弃牌，减少风险'
      });
    } else if (gtoSuggestion.action === 'raise') {
      // 加注为主要建议
      strategies.push({
        action: 'raise',
        frequency: 0.7,
        expectedValue: raiseEV, // 保留真实 EV
        reasoning: this.getPreflopReasoning('raise', tier, position, facingRaise)
      });
      
      // 跟注作为备选（混合策略）
      if (facingRaise || callAmount > 0) {
        strategies.push({
          action: 'call',
          frequency: 0.25,
          expectedValue: callEV * 0.8, // 跟注 EV 略低于理论值
          reasoning: '也可以用跟注来隐藏牌力'
        });
      } else {
        strategies.push({
          action: 'check',
          frequency: 0.25,
          expectedValue: callEV * 0.8,
          reasoning: '也可以用过牌来设置陷阱'
        });
      }
      
      strategies.push({
        action: 'fold',
        frequency: 0.05,
        expectedValue: 0,
        reasoning: '极少情况下可以弃牌'
      });
    }

    // 归一化频率
    const totalFreq = strategies.reduce((sum, s) => sum + s.frequency, 0);
    if (totalFreq > 0) {
      strategies.forEach(s => s.frequency /= totalFreq);
    }

    return strategies.sort((a, b) => b.frequency - a.frequency);
  }

  // 将手牌等级转换为大致权益（胜率）
  private static tierToEquity(tier: number): number {
    // 根据手牌等级估算对抗随机牌的大致胜率
    const equityMap: Record<number, number> = {
      5: 0.85, // PREMIUM: 85% 胜率
      4: 0.70, // STRONG: 70% 胜率
      3: 0.60, // GOOD: 60% 胜率
      2: 0.50, // PLAYABLE: 50% 胜率
      1: 0.40, // MARGINAL: 40% 胜率
      0: 0.30  // TRASH: 30% 胜率
    };
    return equityMap[tier] || 0.50;
  }

  // Preflop 推理说明
  private static getPreflopReasoning(action: string, tier: number, position: string, facingRaise: boolean): string {
    const tierNames = ['垃圾牌', '边缘牌', '可玩牌', '好牌', '强牌', '顶级牌'];
    const tierName = tierNames[tier] || '未知';
    const positionNames: Record<string, string> = {
      'early': '前位',
      'middle': '中位',
      'late': '后位',
      'blinds': '盲注位'
    };
    const posName = positionNames[position] || position;

    if (action === 'fold') {
      return `${tierName}在${posName}${facingRaise ? '面对加注时' : ''}不够强，建议弃牌`;
    } else if (action === 'call') {
      if (facingRaise) {
        return `${tierName}在${posName}面对加注，跟注看翻牌`;
      } else {
        return `${tierName}在${posName}，跟注入池`;
      }
    } else if (action === 'raise') {
      if (tier >= 4) {
        return `${tierName}在${posName}，应该加注建立底池`;
      } else {
        return `${tierName}在${posName}${facingRaise ? '，可以3-bet施压' : '，可以主动加注'}`;
      }
    }

    return '基于GTO混合策略';
  }

  // 计算手牌强度
  private static calculateHandStrength(playerCards: Card[], board: Card[]): number {
    if (board.length === 0) {
      return this.evaluatePreflopStrength(playerCards);
    }

    const allCards = [...playerCards, ...board];
    const evaluation = evaluateHand(allCards);
    
    // 基础成牌强度表 (0-1)
    const rankBaseStrength: Record<HandRank, number> = {
      [HandRank.HighCard]: 0.1,
      [HandRank.OnePair]: 0.4,
      [HandRank.TwoPair]: 0.7,
      [HandRank.ThreeOfAKind]: 0.8,
      [HandRank.Straight]: 0.88,
      [HandRank.Flush]: 0.94,
      [HandRank.FullHouse]: 0.98,
      [HandRank.FourOfAKind]: 0.99,
      [HandRank.StraightFlush]: 1.0,
      [HandRank.RoyalFlush]: 1.0
    };

    let strength = rankBaseStrength[evaluation.rank];

    // 根据牌值微调 (例如顶对 vs 底对)
    // 归一化 value: 假设最大 value 增量约为 1,000,000 (RANK_VALUES 累加)
    const valueBonus = (evaluation.value % 1000000) / 2000000;
    strength += valueBonus;

    // 听牌潜力加成 (Draw Equity)
    if (evaluation.draws) {
      // Flop: x4, Turn: x2 (简化处理，统一 x3)
      const drawEquity = evaluation.draws.outs * 0.035;
      strength += drawEquity;
    }

    return Math.min(strength, 0.99); // 封顶
  }

  // 评估翻牌前强度
  private static evaluatePreflopStrength(cards: Card[]): number {
    if (cards.length !== 2) return 0;

    const rankValues: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    const val1 = rankValues[cards[0].rank];
    const val2 = rankValues[cards[1].rank];
    const isPair = val1 === val2;
    const isSuited = cards[0].suit === cards[1].suit;
    const high = Math.max(val1, val2);
    const low = Math.min(val1, val2);
    const gap = high - low;

    // Chen公式简化版
    let score = high;
    if (isPair) {
      score = Math.max(5, high * 2); 
    } else {
      if (isSuited) score += 2;
      if (gap <= 2) score += 1;
      else if (gap === 3) score -= 1;
      else if (gap === 4) score -= 2;
      else score -= 4; // Gap >= 5
    }

    // 归一化: AA (20+分) -> 1.0, 72o (2分) -> 0.1
    return Math.min(Math.max(score / 20, 0.1), 1);
  }

  // 计算底池赔率
  private static calculatePotOdds(gameState: GameState): number {
    const pot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);
    const maxBet = Math.max(...gameState.players.map(p => p.bet), 0);
    // 假设只需要跟注 maxBet - currentBet，但这里计算简单的 Pot Odds
    // Pot Odds = Call Amount / (Total Pot + Call Amount)
    const activePlayersBet = gameState.players
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.bet, 0);
    const currentPot = pot + activePlayersBet; // 这是一个粗略估计，因为 pot 已经包含了之前的 bet
    
    // 更准确的计算：
    // 当前底池大小 (main pot) + 所有人的当前下注
    // 我们这里假设 gameState.pots 包含了当前轮之前的钱
    // 加上当前轮的下注
    // 实际上 gameState.pots 可能还没有收集当前轮的下注
    // 简化：pot 是总底池
    
    return maxBet > 0 ? maxBet / (pot + maxBet) : 0;
  }

  // 计算权益（简化版蒙特卡洛）
  private static calculateEquity(playerCards: Card[], board: Card[], opponentCount: number): number {
    const handStrength = this.calculateHandStrength(playerCards, board);
    
    // 权益 = 手牌强度 * 对手数量衰减因子
    // 修正：听牌的权益受对手数量影响较小（如果中牌，通常能赢）
    // 成牌的权益受对手数量影响大（容易被反超）
    
    let equity = handStrength;
    
    // 简单的多人底池调整
    if (opponentCount > 1) {
       equity = equity * Math.pow(0.85, opponentCount - 1);
    }
    
    return Math.min(Math.max(equity, 0.05), 0.95);
  }

  // 计算位置价值
  private static getPositionValue(position: number, totalPlayers: number): number {
    const relativePosition = (position - 1 + totalPlayers) % totalPlayers;
    return relativePosition / (totalPlayers - 1);
  }

  // 计算过牌/跟注期望值
  private static calculateCheckCallEV(equity: number, potOdds: number, gameState: GameState): number {
    const pot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);
    const callAmount = Math.max(...gameState.players.map(p => p.bet), 0);
    
    if (callAmount === 0) {
      // 可以过牌
      return equity * pot;
    }
    
    // 需要跟注
    const potAfterCall = pot + callAmount;
    return equity * potAfterCall - callAmount;
  }

  // 计算加注期望值
  private static calculateRaiseEV(
    equity: number,
    handStrength: number,
    position: number,
    gameState: GameState
  ): number {
    const pot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);
    const raiseSize = Math.min(pot * 0.75, gameState.bigBlind * 3);
    
    // 加注成功率（基于位置和手牌强度）
    const foldEquity = (position * 0.3 + handStrength * 0.4) * 0.5;
    
    // 期望值 = 立即赢得底池的概率 * 底池 + 被跟注后赢的概率 * (底池 + 对手跟注) - 加注成本
    const immediateWin = foldEquity * pot;
    const calledWin = (1 - foldEquity) * equity * (pot + raiseSize) - raiseSize;
    
    return immediateWin + calledWin;
  }

  // 计算最优诈唬频率
  private static calculateOptimalBluffFrequency(gameState: GameState): number {
    const pot = gameState.pots.reduce((sum, p) => sum + p.amount, 0);
    const betSize = gameState.bigBlind * 2;
    
    // GTO诈唬频率 = 下注大小 / (底池 + 下注大小)
    const optimalBluffFreq = betSize / (pot + betSize);
    
    // 限制在合理范围内
    return Math.min(optimalBluffFreq, 0.3);
  }

  // 生成推理说明
  private static generateReasoning(
    action: ActionType, 
    equity: number, 
    potOdds: number, 
    position: number,
    phase?: string
  ): string {
    const equityPct = Math.round(equity * 100);
    const positionDesc = position > 0.66 ? '后位优势' : position > 0.33 ? '中位' : '前位劣势';

    switch (action) {
      case 'fold':
        return `权益${equityPct}%不足，底池赔率不划算`;
      
      case 'check':
        // 河牌圈的过牌说明不同
        if (phase === 'river') {
          if (equityPct >= 70) {
            return `权益${equityPct}%，${positionDesc}，过牌诱导对手下注`;
          } else if (equityPct >= 50) {
            return `权益${equityPct}%，${positionDesc}，过牌控制底池大小`;
          } else {
            return `权益${equityPct}%，${positionDesc}，过牌放弃主动权`;
          }
        }
        // 其他阶段可以免费看牌
        return `权益${equityPct}%，${positionDesc}，可以免费看牌`;
      
      case 'call':
        return `权益${equityPct}%，底池赔率合理，值得跟注`;
      
      case 'raise':
        // 河牌圈的加注说明
        if (phase === 'river') {
          if (equityPct >= 70) {
            return `权益${equityPct}%，${positionDesc}，价值下注榨取价值`;
          } else if (equityPct <= 30) {
            return `权益${equityPct}%，${positionDesc}，诈唬施压迫使对手弃牌`;
          }
        }
        return `权益${equityPct}%，${positionDesc}，加注获取价值或施压`;
      
      default:
        return '基于GTO混合策略';
    }
  }

  // 获取推荐动作（最高EV）
  static getRecommendedAction(player: Player, gameState: GameState): GTOStrategy {
    const strategies = this.getStrategy(player, gameState);
    return strategies[0] || {
      action: 'fold',
      frequency: 1,
      expectedValue: 0,
      reasoning: '无可用策略'
    };
  }

  // 分析当前决策质量
  static analyzeDecision(
    playerAction: ActionType,
    player: Player,
    gameState: GameState
  ): { quality: number; feedback: string } {
    const strategies = this.getStrategy(player, gameState);
    const matchingStrategy = strategies.find(s => s.action === playerAction);

    if (!matchingStrategy) {
      return {
        quality: 0,
        feedback: '该动作不在GTO推荐范围内，可能存在较大偏差'
      };
    }

    const quality = matchingStrategy.frequency * (matchingStrategy.expectedValue > 0 ? 1 : 0.5);
    
    let feedback = '';
    if (quality > 0.7) {
      feedback = '✓ 优秀决策，符合GTO原则';
    } else if (quality > 0.4) {
      feedback = '○ 可接受的决策，但还有优化空间';
    } else {
      feedback = '✗ 偏离GTO策略较多，建议重新考虑';
    }

    return { quality, feedback };
  }
}
