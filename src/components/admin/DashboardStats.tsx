import React from 'react';
import { Link2, MousePointerClick, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface DashboardStatsProps {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  totalConversions: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalLinks,
  activeLinks,
  totalClicks,
  totalConversions,
}) => {
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';
  const estimatedEarnings = (totalConversions * 45).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  }); // Simulated commission or estimated CPC earnings

  const stats = [
    {
      title: 'Total Links',
      value: totalLinks,
      icon: Link2,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Active Links',
      value: activeLinks,
      icon: Activity,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Total Clicks',
      value: totalClicks,
      icon: MousePointerClick,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Conversions',
      value: totalConversions,
      icon: TrendingUp,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      title: 'Est. Earnings',
      value: estimatedEarnings,
      icon: DollarSign,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{stat.title}</span>
              <div className={`p-2 rounded-lg border ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">{stat.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
