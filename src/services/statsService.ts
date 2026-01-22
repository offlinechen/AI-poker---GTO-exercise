import { db } from './database';
import { HandHistory, PlayerStats, Player } from '../types';

export class StatsService {
  // 初始化玩家统计
  static async initializePlayerStats(playerId: string): Promise<PlayerStats> {
    const existing = await db.getPlayerStats(playerId);
    
    if (existing) {
      return existing;
    }

    const newStats: PlayerStats = {
      playerId,
      handsPlayed: 0,
      handsWon: 0,
      totalWinnings: 0,
      vpip: 0,
      pfr: 0,
      aggression: 0,
      winRate: 0
    };

    await db.savePlayerStats(playerId, newStats);
    return newStats;
  }

  // 更新玩家统计（基于手牌历史）
  static async updateStatsFromHand(hand: HandHistory): Promise<void> {
    for (const player of hand.players) {
      const stats = await db.getPlayerStats(player.id) || await this.initializePlayerStats(player.id);
      
      // 更新基础统计
      stats.handsPlayed += 1;

      // 检查是否赢得底池
      const winner = hand.winners.find(w => w.playerId === player.id);
      if (winner) {
        stats.handsWon += 1;
        stats.totalWinnings += winner.amount;
      }

      // 计算VPIP (Voluntarily Put money In Pot)
      const playerActions = hand.actions.filter(a => a.playerId === player.id);
      const voluntaryAction = playerActions.find(a => 
        a.action.type === 'call' || a.action.type === 'raise' || a.action.type === 'all-in'
      );
      
      if (voluntaryAction) {
        stats.vpip = ((stats.vpip * (stats.handsPlayed - 1)) + 1) / stats.handsPlayed;
      } else {
        stats.vpip = (stats.vpip * (stats.handsPlayed - 1)) / stats.handsPlayed;
      }

      // 计算PFR (Pre-Flop Raise)
      const preflopRaise = playerActions.find(a => 
        a.phase === 'preflop' && (a.action.type === 'raise' || a.action.type === 'all-in')
      );
      
      if (preflopRaise) {
        stats.pfr = ((stats.pfr * (stats.handsPlayed - 1)) + 1) / stats.handsPlayed;
      } else {
        stats.pfr = (stats.pfr * (stats.handsPlayed - 1)) / stats.handsPlayed;
      }

      // 计算攻击性
      const raiseCount = playerActions.filter(a => a.action.type === 'raise').length;
      const callCount = playerActions.filter(a => a.action.type === 'call').length;
      const currentAggression = callCount > 0 ? raiseCount / callCount : raiseCount;
      
      stats.aggression = ((stats.aggression * (stats.handsPlayed - 1)) + currentAggression) / stats.handsPlayed;

      // 计算胜率
      stats.winRate = stats.handsPlayed > 0 ? stats.handsWon / stats.handsPlayed : 0;

      // 保存更新后的统计
      await db.savePlayerStats(player.id, stats);
    }
  }

  // 获取玩家统计
  static async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const stats = await db.getPlayerStats(playerId);
    return stats || await this.initializePlayerStats(playerId);
  }

  // 获取所有玩家统计排行榜
  static async getLeaderboard(sortBy: keyof PlayerStats = 'totalWinnings', limit: number = 10): Promise<PlayerStats[]> {
    const allStats = await db.getAllStats();
    const statsArray = allStats.map(s => s.stats);
    
    return statsArray
      .sort((a, b) => {
        const aValue = a[sortBy] as number;
        const bValue = b[sortBy] as number;
        return bValue - aValue;
      })
      .slice(0, limit);
  }

  // 重置所有统计
  static async resetAllStats(): Promise<void> {
    const allStats = await db.getAllStats();
    for (const stat of allStats) {
      await db.resetPlayerStats(stat.playerId);
    }
  }

  // 导出统计数据
  static async exportStats(): Promise<string> {
    const allStats = await db.getAllStats();
    return JSON.stringify(allStats, null, 2);
  }

  // 导入统计数据
  static async importStats(jsonData: string): Promise<void> {
    const stats = JSON.parse(jsonData);
    
    for (const stat of stats) {
      await db.savePlayerStats(stat.playerId, stat.stats);
    }
  }

  // 获取统计摘要
  static async getStatsSummary(playerId: string): Promise<{
    totalHands: number;
    winRate: number;
    profitPerHand: number;
    playStyle: string;
  }> {
    const stats = await this.getPlayerStats(playerId);
    
    const profitPerHand = stats.handsPlayed > 0 ? stats.totalWinnings / stats.handsPlayed : 0;
    
    // 根据VPIP和PFR判断打法风格
    let playStyle = '观察中';
    if (stats.handsPlayed >= 20) {
      if (stats.vpip > 0.3 && stats.pfr > 0.2) {
        playStyle = '激进型';
      } else if (stats.vpip < 0.2 && stats.pfr < 0.15) {
        playStyle = '保守型';
      } else if (stats.vpip > 0.25 && stats.pfr < 0.15) {
        playStyle = '跟注型';
      } else {
        playStyle = '稳健型';
      }
    }

    return {
      totalHands: stats.handsPlayed,
      winRate: stats.winRate * 100,
      profitPerHand,
      playStyle
    };
  }
}
