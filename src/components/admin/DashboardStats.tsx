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
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:border-indigo-500/20',
    },
    {
      title: 'Active Links',
      value: activeLinks,
      icon: Activity,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:border-emerald-500/20',
    },
    {
      title: 'Total Clicks',
      value: totalClicks,
      icon: MousePointerClick,
      color: 'text-amber-600 bg-amber-50 border-amber-100 dark:border-amber-500/20',
    },
    {
      title: 'Conversions',
      value: totalConversions,
      icon: TrendingUp,
      color: 'text-rose-600 bg-rose-50 border-rose-100 dark:border-rose-500/20',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100 dark:border-cyan-500/20',
    },
    {
      title: 'Est. Earnings',
      value: estimatedEarnings,
      icon: DollarSign,
      color: 'text-violet-600 bg-violet-50 border-violet-100 dark:border-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div 
            key={i} 
            className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md hover:border-indigo-150 transition-all duration-300 group hover:-translate-y-0.5 relative overflow-hidden"
          >
            {/* Ambient pattern glow background */}
            <div className="absolute right-0 top-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

            <div className="flex items-center justify-between mb-4 z-10">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{stat.title}</span>
              <div className={`p-2 rounded-xl border ${stat.color} transition-transform group-hover:scale-105 duration-300`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="z-10">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {stat.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

