import { Player, GameState, AIDecision, ActionType, AIDifficulty, Card } from '../../types';
import { AI_DIFFICULTY_CONFIG } from '../../constants';
import { evaluateHand } from '../../utils/handEvaluator';
import { PreflopRanges, HandTier } from './PreflopRanges';
import { AI_STYLES, AIStyle } from '../../types/aiStyle';

export class AIEngine {
  // 获取AI决策
  static getDecision(player: Player, gameState: GameState): AIDecision {
    if (!player.difficulty) {
      return { action: 'fold', amount: 0, confidence: 0 };
    }

    const config = AI_DIFFICULTY_CONFIG[player.difficulty];
    const styleConfig = player.aiStyle ? AI_STYLES[player.aiStyle] : AI_STYLES.TAG;
    
    // Preflop阶段使用GTO策略
    if (gameState.phase === 'preflop') {
      return this.getPreflopDecision(player, gameState, config);
    }

    // Postflop使用原有启发式策略
    const handStrength = this.evaluateHandStrength(player.cards, gameState.board);
    const potOdds = this.calculatePotOdds(gameState);
    const position = this.getPositionStrength(player.position, gameState.players.length);

    // 基于手牌强度和GTO原则的决策（加入风格调整）
    const baseDecision = this.makeBaseDecision(
      handStrength,
      potOdds,
      position,
      gameState,
      player,
      styleConfig  // 传入风格配置
    );

    // 根据难度调整决策
    const finalDecision = this.adjustDecisionByDifficulty(
      baseDecision,
      config,
      handStrength,
      player,
      gameState
    );

    return finalDecision;
  }

  // Preflop GTO决策
  private static getPreflopDecision(
    player: Player,
    gameState: GameState,
    config: typeof AI_DIFFICULTY_CONFIG.easy
  ): AIDecision {
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
    
    // **关键修复：检查是否是盲注位且已投入筹码**
    const isInBlind = player.bet > 0;  // 大小盲已经投入筹码
    const callAmount = maxBet - player.bet;
    
    // 获取GTO建议
    const gtoSuggestion = PreflopRanges.getGTOAction(
      tier,
      position,
      facingRaise,
      gameState.pots.reduce((sum, pot) => sum + pot.amount, 0),
      gameState.bigBlind,
      isInBlind,  // 传递盲注信息
      callAmount,
      gameState.bigBlind
    );

    // 获取AI风格配置
    const styleConfig = player.aiStyle ? AI_STYLES[player.aiStyle] : AI_STYLES.TAG;
    
    let action: ActionType = gtoSuggestion.action;
    let amount = 0;
    let confidence = gtoSuggestion.confidence;

    // 根据风格调整决策
    action = this.adjustActionByStyle(
      action,
      tier,
      styleConfig,
      facingRaise,
      config.gtoAdherence,
      isInBlind,  // 传递盲注信息
      callAmount,
      gameState.bigBlind
    );

    // 计算具体金额
    if (action === 'raise') {
      const raiseSize = gtoSuggestion.raiseSize || gameState.bigBlind * 2.5;
      // 根据攻击性调整加注大小
      const sizeMultiplier = 0.8 + (styleConfig.aggression / 3) * 0.4; // 0.8-1.2
      amount = Math.round(Math.min(
        Math.max(raiseSize * sizeMultiplier, gameState.minRaise),
        player.chips
      ));
      
      if (amount >= player.chips) {
        action = 'all-in';
        amount = player.chips;
      }
    } else if (action === 'call') {
      amount = Math.min(callAmount, player.chips);
      if (amount >= player.chips) {
        action = 'all-in';
        amount = player.chips;
      }
    }

    return {
      action,
      amount,
      confidence,
      thinking: this.generateThinking(action, confidence, player.difficulty!)
    };
  }

  // 根据风格调整动作
  private static adjustActionByStyle(
    baseAction: ActionType | 'raise' | 'call' | 'fold',
    tier: HandTier,
    style: typeof AI_STYLES.TAG,
    facingRaise: boolean,
    gtoAdherence: number,
    isInBlind: boolean = false,
    callAmount: number = 0,
    bigBlind: number = 0
  ): ActionType {
    // 计算手牌强度归一化值 (0-1)
    const handStrength = tier / 5;
    
    // **盲注位特殊保护：已经投入筹码，应该更难弃牌**
    if (isInBlind && callAmount <= bigBlind * 2) {
      // 盲注位面对小额跟注，除非是垃圾牌，否则几乎不弃牌
      if (tier >= HandTier.MARGINAL) {
        // 边缘牌及以上必定跟注
        if (baseAction === 'fold') return 'call';
      } else if (tier === HandTier.TRASH) {
        // 即使垃圾牌，80%概率跟注（底池赔率好）
        if (Math.random() < 0.8 && baseAction === 'fold') return 'call';
      }
    }
    
    // 根据VPIP判断是否入池（大幅提升入池概率）
    const vpipBonus = handStrength * 0.5 + 0.15;  // 基础加成0.15，手牌加成0.5
    const shouldEnterPot = Math.random() < style.vpip + vpipBonus;
    
    if (!shouldEnterPot && (baseAction === 'call' || baseAction === 'raise')) {
      // 大幅降低弃牌概率：只有垃圾牌才考虑弃牌
      if (handStrength < 0.15 && Math.random() < 0.3) {  // 从0.2/0.5改为0.15/0.3
        return 'fold';
      }
      // 否则仍然入池
    }
    
    // 如果决定入池，根据PFR和攻击性决定raise还是call
    if (baseAction === 'call' || baseAction === 'check') {
      const shouldRaise = Math.random() < (style.pfr / style.vpip) && handStrength > 0.2;  // 从0.25降低到0.2
      if (shouldRaise) {
        return 'raise';
      }
    }
    
    // 松凶玩家更倾向于加注而非跟注
    if (style.aggression > 2 && baseAction === 'call' && Math.random() < 0.4) {  // 从0.35提升到0.4
      return 'raise';
    }
    
    // 紧弱玩家倾向于跟注而非加注
    if (style.aggression < 1.5 && baseAction === 'raise' && !facingRaise && Math.random() < 0.5) {
      return 'call';
    }
    
    return baseAction;
  }

  // 评估手牌强度（0-1）
  private static evaluateHandStrength(playerCards: Card[], board: Card[]): number {
    if (board.length === 0) {
      // 翻牌前手牌评估
      return this.evaluatePreflopHand(playerCards);
    }

    // 翻牌后评估
    const allCards = [...playerCards, ...board];
    const evaluation = evaluateHand(allCards);
    
    // 将手牌等级转换为0-1的强度值
    const maxRank = 9; // Royal Flush
    const baseStrength = evaluation.rank / maxRank;
    
    // 考虑牌型内的相对强度
    const relativeStrength = (evaluation.value % 1000000) / 1000000;
    
    return Math.min(baseStrength + relativeStrength * 0.1, 1);
  }

  // 评估翻牌前手牌
  private static evaluatePreflopHand(cards: Card[]): number {
    if (cards.length !== 2) return 0;

    const [card1, card2] = cards;
    const rankValues: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    const val1 = rankValues[card1.rank];
    const val2 = rankValues[card2.rank];
    const isPair = val1 === val2;
    const isSuited = card1.suit === card2.suit;
    const highCard = Math.max(val1, val2);
    const lowCard = Math.min(val1, val2);
    const gap = highCard - lowCard;

    // 基础评分
    let strength = 0;

    // 对子加分
    if (isPair) {
      strength = 0.5 + (val1 / 14) * 0.4; // AA = 0.9, 22 = 0.57
    } else {
      // 高牌价值
      strength = (highCard / 14) * 0.4;
      // 第二张牌价值
      strength += (lowCard / 14) * 0.2;
      // 同花加分
      if (isSuited) strength += 0.1;
      // 连牌加分
      if (gap <= 3) strength += (4 - gap) * 0.05;
    }

    return Math.min(strength, 1);
  }

  // 计算底池赔率
  private static calculatePotOdds(gameState: GameState): number {
    const totalPot = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
    const maxBet = Math.max(...gameState.players.map(p => p.bet), 0);
    
    if (totalPot === 0) return 0;
    return maxBet / (totalPot + maxBet);
  }

  // 获取位置优势（0-1）
  private static getPositionStrength(position: number, totalPlayers: number): number {
    // 庄家位置最好（1.0），小盲位最差（0.0）
    const relativePosition = (position - 1 + totalPlayers) % totalPlayers;
    return relativePosition / (totalPlayers - 1);
  }

  // 基础决策
  private static makeBaseDecision(
    handStrength: number,
    potOdds: number,
    position: number,
    gameState: GameState,
    player: Player,
    styleConfig: typeof AI_STYLES.TAG  // 新增：风格配置
  ): { action: ActionType; amount: number; confidence: number } {
    const maxBet = Math.max(...gameState.players.map(p => p.bet), 0);
    const callAmount = maxBet - player.bet;
    const potSize = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);

    // 动态调整决策阈值（根据阶段、位置和风格）
    const phaseMultiplier = this.getPhaseMultiplier(gameState.phase);
    const foldThreshold = (0.25 + position * 0.1) * phaseMultiplier + styleConfig.foldThresholdAdjust;
    const raiseThreshold = (0.6 + position * 0.1) * phaseMultiplier + styleConfig.raiseThresholdAdjust;

    // 计算实际底池赔率
    const actualPotOdds = callAmount / (potSize + callAmount);
    
    // 极强牌 - 价值下注/加注
    if (handStrength > raiseThreshold) {
      // 根据牌力和风格攻击性调整加注大小
      const valueMultiplier = 0.5 + (handStrength - raiseThreshold) * 1.0;
      const aggressionMultiplier = 0.7 + (styleConfig.aggression / 3) * 0.6; // 0.7-1.3
      const baseRaise = Math.floor(potSize * valueMultiplier * aggressionMultiplier);
      
      // 限制在合理范围：minRaise 到 底池1.5倍
      const maxRaiseAmount = Math.round(Math.min(potSize * 1.5, player.chips));
      const raiseAmount = Math.round(Math.max(
        Math.min(baseRaise, maxRaiseAmount),
        gameState.minRaise
      ));
      
      // 慢打检查（紧弱玩家更倾向慢打）
      if (Math.random() < styleConfig.slowPlayFrequency && !callAmount) {
        return { action: 'check', amount: 0, confidence: handStrength };
      }
      
      if (player.chips < gameState.minRaise) {
        return {
          action: 'all-in',
          amount: player.chips,
          confidence: handStrength
        };
      }
      
      return {
        action: raiseAmount >= player.chips ? 'all-in' : 'raise',
        amount: raiseAmount,
        confidence: handStrength
      };
    }

    // 中等牌 - 底池赔率计算
    if (handStrength > foldThreshold) {
      if (callAmount === 0) {
        // 免费看牌 - 激进玩家可能选择下注
        if (styleConfig.aggression > 2 && Math.random() < 0.25) {
          const betSize = Math.round(Math.min(potSize * 0.5, player.chips));
          return {
            action: betSize >= player.chips ? 'all-in' : 'raise',
            amount: Math.round(Math.max(betSize, gameState.minRaise)),
            confidence: handStrength
          };
        }
        return { action: 'check', amount: 0, confidence: handStrength };
      }
      
      // 使用底池赔率决策
      if (handStrength > actualPotOdds) {
        return { action: 'call', amount: callAmount, confidence: handStrength };
      }
      
      // 考虑隐含赔率
      const impliedOdds = this.calculateImpliedOdds(gameState, player, handStrength);
      if (handStrength + impliedOdds > actualPotOdds) {
        return { action: 'call', amount: callAmount, confidence: handStrength + impliedOdds };
      }
    }

    // 弱牌处理
    if (callAmount === 0) {
      // 考虑诈唬机会（根据风格调整诈唬频率）
      if (this.shouldBluff(gameState, position, handStrength, styleConfig.bluffFrequency)) {
        const bluffSize = Math.round(Math.min(potSize * 0.6, player.chips));
        return {
          action: bluffSize >= player.chips ? 'all-in' : 'raise',
          amount: Math.round(Math.max(bluffSize, gameState.minRaise)),
          confidence: 0.3
        };
      }
      return { action: 'check', amount: 0, confidence: handStrength };
    }

    return { action: 'fold', amount: 0, confidence: 0 };
  }

  // 计算阶段乘数（越晚期越保守）
  private static getPhaseMultiplier(phase: string): number {
    switch (phase) {
      case 'flop': return 1.0;
      case 'turn': return 1.1;
      case 'river': return 1.2;
      default: return 1.0;
    }
  }

  // 计算隐含赔率
  private static calculateImpliedOdds(gameState: GameState, player: Player, handStrength: number): number {
    // 如果有听牌可能（中等手牌），考虑后续可赢得的筹码
    if (handStrength > 0.3 && handStrength < 0.6) {
      const opponentsChips = gameState.players
        .filter(p => p.id !== player.id && p.status !== 'folded' && p.status !== 'out')
        .reduce((sum, p) => sum + p.chips, 0);
      
      const potSize = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
      
      // 估算能从对手那里赢得的额外筹码比例
      return Math.min(0.15, opponentsChips / (potSize * 10));
    }
    
    return 0;
  }

  // 判断是否应该诈唬
  private static shouldBluff(
    gameState: GameState, 
    position: number, 
    handStrength: number,
    bluffFrequency: number = 0.15  // 新增：从风格配置传入
  ): boolean {
    // 诈唬条件：
    // 1. 位置好（后位）
    // 2. 手牌弱但不是垃圾（有改进潜力）
    // 3. 对手数量少
    // 4. 当前阶段适合（flop/turn比river更适合）
    
    const activePlayers = gameState.players.filter(p => 
      p.status === 'active' || p.status === 'waiting'
    ).length;
    
    const isGoodPosition = position > 0.6;
    const isWeakButPlayable = handStrength > 0.15 && handStrength < 0.4;
    const fewOpponents = activePlayers <= 2;
    const goodPhase = gameState.phase === 'flop' || gameState.phase === 'turn';
    
    // 综合判断，使用风格配置的诈唬频率
    return isGoodPosition && isWeakButPlayable && fewOpponents && goodPhase && Math.random() < bluffFrequency;
  }

  // 根据难度调整决策
  private static adjustDecisionByDifficulty(
    baseDecision: { action: ActionType; amount: number; confidence: number },
    config: typeof AI_DIFFICULTY_CONFIG.easy,
    handStrength: number,
    player: Player,
    gameState: GameState
  ): AIDecision {
    let { action, amount, confidence } = baseDecision;

    // 随机因素 - 难度越低，随机性越高
    const randomFactor = Math.random();
    const gtoDeviation = 1 - config.gtoAdherence;

    // 低难度AI会有更多错误决策
    if (randomFactor > config.gtoAdherence) {
      // 有时会过度激进
      if (randomFactor < gtoDeviation * 0.5 && action === 'call') {
        action = 'raise';
        // 确保加注金额至少等于 minRaise
        amount = Math.round(Math.max(
          Math.min(gameState.bigBlind * 3, player.chips),
          gameState.minRaise
        ));
        if (player.chips < gameState.minRaise) {
          action = 'all-in';
          amount = player.chips;
        }
      }
      // 有时会过度保守
      else if (randomFactor < gtoDeviation && action === 'raise') {
        action = handStrength > 0.4 ? 'call' : 'fold';
        amount = action === 'call' ? Math.max(...gameState.players.map(p => p.bet)) - player.bet : 0;
      }
    }

    // 诈唬逻辑
    if (Math.random() < config.bluffFrequency && handStrength < 0.4) {
      if (action === 'fold' || action === 'check') {
        action = 'raise';
        // 确保加注金额至少等于 minRaise
        amount = Math.round(Math.max(
          Math.min(gameState.bigBlind * 2, player.chips),
          gameState.minRaise
        ));
        if (player.chips < gameState.minRaise) {
          action = 'all-in';
          amount = player.chips;
        }
        confidence = 0.3;
      }
    }

    // 慢打逻辑（隐藏强牌）
    if (Math.random() < config.slowPlayFrequency && handStrength > 0.8) {
      if (action === 'raise') {
        action = Math.max(...gameState.players.map(p => p.bet)) > player.bet ? 'call' : 'check';
        amount = action === 'call' ? Math.max(...gameState.players.map(p => p.bet)) - player.bet : 0;
      }
    }

    return {
      action,
      amount,
      confidence,
      thinking: this.generateThinking(action, handStrength, player.difficulty!)
    };
  }

  // 生成AI思考过程（用于调试和展示）
  private static generateThinking(action: ActionType, handStrength: number, difficulty: AIDifficulty): string {
    const strengthDesc = handStrength > 0.7 ? '强牌' : handStrength > 0.4 ? '中等牌' : '弱牌';
    const actionDesc = {
      'fold': '放弃这手牌',
      'check': '观望局势',
      'call': '跟进看看',
      'raise': '施加压力',
      'all-in': '全力以赴'
    }[action];

    return `[${difficulty}] 持有${strengthDesc}，决定${actionDesc}`;
  }

  // 批量处理所有AI玩家的决策（同步执行，不使用setTimeout）
  static processAITurns(gameState: GameState, onDecision: (playerId: string, decision: AIDecision) => void): void {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    console.log('[AIEngine] processAITurns called:', {
      currentPlayerIndex: gameState.currentPlayerIndex,
      currentPlayer: currentPlayer ? {
        id: currentPlayer.id,
        name: currentPlayer.name,
        type: currentPlayer.type,
        status: currentPlayer.status
      } : null,
      phase: gameState.phase
    });
    
    if (!currentPlayer) {
      console.warn('[AIEngine] No current player found');
      return;
    }
    
    // 检查AI玩家是否可以行动（active 或 waiting 状态）
    const canAct = currentPlayer.status === 'active' || currentPlayer.status === 'waiting';
    
    if (currentPlayer.type === 'ai' && canAct) {
      console.log(`[AIEngine] ${currentPlayer.name} 正在思考... (phase: ${gameState.phase})`);
      const decision = this.getDecision(currentPlayer, gameState);
      console.log(`[AIEngine] ${currentPlayer.name} 决定: ${decision.action}${decision.amount ? ` $${decision.amount}` : ''}`);
      onDecision(currentPlayer.id, decision);
    } else {
      console.log(`[AIEngine] 跳过 ${currentPlayer.name} (type: ${currentPlayer.type}, status: ${currentPlayer.status}, canAct: ${canAct})`);
    }
  }

  // 异步处理AI回合（用于需要延迟的场景）
  static async processAITurnAsync(
    gameState: GameState, 
    onDecision: (playerId: string, decision: AIDecision) => void,
    delay: number = 400 // 默认400ms延迟，可加快到200ms
  ): Promise<void> {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.type === 'ai' && currentPlayer.status === 'active') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const decision = this.getDecision(currentPlayer, gameState);
          onDecision(currentPlayer.id, decision);
          resolve();
        }, delay);
      });
    }
  }
}
