/**
 * AI打法风格类型
 */

export type AIStyle = 'TAG' | 'LAG' | 'TAP' | 'LAP';

/**
 * AI风格配置
 * 
 * TAG (Tight-Aggressive) - 紧凶：少打牌，打就凶
 * LAG (Loose-Aggressive) - 松凶：多打牌，打就凶
 * TAP (Tight-Passive) - 紧弱：少打牌，被动跟注
 * LAP (Loose-Passive) - 松弱：多打牌，被动跟注（鱼玩家）
 */
export interface AIStyleConfig {
  name: string;
  description: string;
  
  // VPIP (Voluntarily Put money In Pot) - 主动入池率
  vpip: number; // 0-1, 越高越松
  
  // PFR (Pre-Flop Raise) - 翻牌前加注率
  pfr: number; // 0-1, 越高越激进
  
  // 攻击性因子 (Aggression Factor)
  aggression: number; // 0-3, (raise+bet)/(call)比例
  
  // 3-bet频率
  threeBetFrequency: number; // 0-1
  
  // 诈唬频率
  bluffFrequency: number; // 0-1
  
  // 慢打频率（隐藏强牌）
  slowPlayFrequency: number; // 0-1
  
  // 弃牌阈值调整（相对于基础值）
  foldThresholdAdjust: number; // -0.2 到 0.2
  
  // 加注阈值调整（相对于基础值）
  raiseThresholdAdjust: number; // -0.2 到 0.2
}

/**
 * 预定义风格配置
 */
export const AI_STYLES: Record<AIStyle, AIStyleConfig> = {
  // 紧凶 - 职业玩家风格
  TAG: {
    name: '紧凶',
    description: '只打强牌，打就凶狠',
    vpip: 0.35,              // 35% 入池率（从28%再提升）
    pfr: 0.28,               // 28% 加注率（从22%提升）
    aggression: 2.5,         // 高攻击性
    threeBetFrequency: 0.12,
    bluffFrequency: 0.20,    // 诈唬频率提升
    slowPlayFrequency: 0.05,
    foldThresholdAdjust: -0.08,  // 更不容易弃牌（从-0.02提升）
    raiseThresholdAdjust: -0.12  // 更容易加注
  },
  
  // 松凶 - 进攻型玩家
  LAG: {
    name: '松凶',
    description: '大量入池，激进施压',
    vpip: 0.50,              // 50% 入池率（从42%提升）
    pfr: 0.38,               // 38% 加注率（从32%提升）
    aggression: 3.0,         // 极高攻击性
    threeBetFrequency: 0.18,
    bluffFrequency: 0.40,    // 频繁诈唬
    slowPlayFrequency: 0.02, // 很少慢打
    foldThresholdAdjust: -0.20,  // 极难弃牌（从-0.15提升）
    raiseThresholdAdjust: -0.20  // 很容易加注
  },
  
  // 紧弱 - 保守型玩家
  TAP: {
    name: '紧弱',
    description: '选择性入池，被动跟注',
    vpip: 0.32,              // 32% 入池率（从25%提升）
    pfr: 0.15,               // 15% 加注率（从12%提升）
    aggression: 0.8,         // 低攻击性
    threeBetFrequency: 0.06,
    bluffFrequency: 0.10,    // 很少诈唬
    slowPlayFrequency: 0.12, // 经常慢打
    foldThresholdAdjust: -0.05,  // 不容易弃牌（从0.02改为负数）
    raiseThresholdAdjust: 0.05   // 不容易加注
  },
  
  // 松弱 - 娱乐玩家/鱼
  LAP: {
    name: '松弱',
    description: '大量跟注，很少加注',
    vpip: 0.65,              // 65% 入池率（从55%提升）
    pfr: 0.15,               // 15% 加注率（从12%提升）
    aggression: 0.5,         // 很低攻击性
    threeBetFrequency: 0.04,
    bluffFrequency: 0.12,    // 偶尔诈唬
    slowPlayFrequency: 0.15, // 频繁慢打（不会利用强牌）
    foldThresholdAdjust: -0.25,  // 极难弃牌（从-0.20提升）
    raiseThresholdAdjust: 0.10   // 很难加注
  }
};

/**
 * 为AI玩家随机分配风格（保持多样性）
 */
export function assignRandomStyle(difficulty: string): AIStyle {
  // 根据难度调整风格分布
  const styles: AIStyle[] = ['TAG', 'LAG', 'TAP', 'LAP'];
  
  switch (difficulty) {
    case 'easy':
      // 简单难度：更多松弱玩家
      return weightedRandom([
        { style: 'TAG', weight: 1 },
        { style: 'LAG', weight: 2 },
        { style: 'TAP', weight: 2 },
        { style: 'LAP', weight: 5 }  // 50%概率（从4提升到5）
      ]);
      
    case 'medium':
      // 中等难度：偏松的平衡分布
      return weightedRandom([
        { style: 'TAG', weight: 2 },
        { style: 'LAG', weight: 3 },  // 更多松凶
        { style: 'TAP', weight: 2 },
        { style: 'LAP', weight: 3 }   // 更多松弱
      ]);
      
    case 'hard':
      // 困难难度：平衡分布
      return weightedRandom([
        { style: 'TAG', weight: 3 },  // 减少紧凶
        { style: 'LAG', weight: 4 },  // 增加松凶
        { style: 'TAP', weight: 2 },
        { style: 'LAP', weight: 1 }
      ]);
      
    case 'expert':
      // 专家难度：松凶和紧凶为主
      return weightedRandom([
        { style: 'TAG', weight: 4 },  // 减少
        { style: 'LAG', weight: 5 },  // 增加松凶
        { style: 'TAP', weight: 1 },
        { style: 'LAP', weight: 0 }
      ]);
      
    default:
      return styles[Math.floor(Math.random() * styles.length)];
  }
}

/**
 * 加权随机选择
 */
function weightedRandom(options: Array<{ style: AIStyle; weight: number }>): AIStyle {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option.style;
    }
  }
  
  return options[0].style;
}

/**
 * 获取风格的显示名称（带emoji）
 */
export function getStyleDisplayName(style: AIStyle): string {
  const config = AI_STYLES[style];
  const emoji = {
    TAG: '🎯',
    LAG: '🔥',
    TAP: '🛡️',
    LAP: '🐟'
  }[style];
  
  return `${emoji} ${config.name}`;
}
