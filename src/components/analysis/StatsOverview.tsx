import { motion } from 'framer-motion';
import { PlayerStats } from '../../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsOverviewProps {
  stats: PlayerStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const winRatePct = Math.round(stats.winRate * 100);
  const vpipPct = Math.round(stats.vpip * 100);
  const pfrPct = Math.round(stats.pfr * 100);
  const profitPerHand = stats.handsPlayed > 0 ? Math.round(stats.totalWinnings / stats.handsPlayed) : 0;

  // 统计卡片数据
  const statCards = [
    {
      icon: '🏆',
      label: '总手数',
      value: stats.handsPlayed,
      color: 'text-primary',
      bgColor: 'bg-primary/20'
    },
    {
      icon: '📈',
      label: '胜率',
      value: `${winRatePct}%`,
      color: 'text-warning',
      bgColor: 'bg-warning/20'
    },
    {
      icon: '🔥',
      label: '总盈利',
      value: `$${stats.totalWinnings}`,
      color: stats.totalWinnings >= 0 ? 'text-success' : 'text-error',
      bgColor: stats.totalWinnings >= 0 ? 'bg-success/20' : 'bg-error/20'
    },
    {
      icon: '🎯',
      label: '每手平均',
      value: `$${profitPerHand}`,
      color: profitPerHand >= 0 ? 'text-info' : 'text-error',
      bgColor: profitPerHand >= 0 ? 'bg-info/20' : 'bg-error/20'
    }
  ];

  // 打法风格数据
  const styleData = [
    { name: 'VPIP', value: vpipPct, color: '#10B981' },
    { name: 'PFR', value: pfrPct, color: '#F59E0B' },
    { name: '攻击性', value: Math.round(stats.aggression * 10), color: '#EF4444' }
  ];

  // 打法风格饼图数据
  const pieData = [
    { name: '入池率', value: vpipPct },
    { name: '加注率', value: pfrPct },
    { name: '其他', value: Math.max(0, 100 - vpipPct - pfrPct) }
  ];

  const COLORS = ['#10B981', '#F59E0B', '#6B7280'];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 ${card.bgColor} rounded-lg text-2xl`}>
                {card.icon}
              </div>
              <div>
                <div className="text-sm text-text-muted mb-1">{card.label}</div>
                <div className="text-2xl font-bold">{card.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 打法风格柱状图 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6"
        >
          <h3 className="text-lg font-bold mb-4">打法风格分析</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={styleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">VPIP (入池率)</span>
              <span className="font-semibold">{vpipPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">PFR (加注率)</span>
              <span className="font-semibold">{pfrPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">攻击性指数</span>
              <span className="font-semibold">{stats.aggression.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>

        {/* 打法分布饼图 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-background-dark to-background rounded-xl border border-white/10 p-6"
        >
          <h3 className="text-lg font-bold mb-4">行为分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${Math.round(entry.value)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 打法建议 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/30 p-6"
      >
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="text-primary text-xl">🎯</span>
          个性化建议
        </h3>
        <div className="grid gap-3 text-sm">
          {vpipPct > 30 && (
            <div className="p-3 bg-background-dark/50 rounded-lg">
              💡 你的入池率偏高({vpipPct}%)，建议更谨慎选择起手牌
            </div>
          )}
          {pfrPct < 10 && stats.handsPlayed > 20 && (
            <div className="p-3 bg-background-dark/50 rounded-lg">
              💡 加注率较低({pfrPct}%)，可以尝试更主动地加注以获取主动权
            </div>
          )}
          {stats.aggression < 0.5 && stats.handsPlayed > 20 && (
            <div className="p-3 bg-background-dark/50 rounded-lg">
              💡 打法偏保守，适当增加攻击性可能带来更好收益
            </div>
          )}
          {stats.winRate < 0.3 && stats.handsPlayed > 50 && (
            <div className="p-3 bg-background-dark/50 rounded-lg">
              💡 胜率较低，建议重点学习GTO策略和位置优势
            </div>
          )}
          {stats.handsPlayed < 20 && (
            <div className="p-3 bg-background-dark/50 rounded-lg">
              📊 数据样本较少，继续积累更多手数以获得更准确的分析
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
