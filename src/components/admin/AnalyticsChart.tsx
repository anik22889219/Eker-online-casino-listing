import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AffiliateLink } from '../../types';

interface AnalyticsChartProps {
  links: AffiliateLink[];
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ links }) => {
  // Prep chart data
  const data = links.map(link => ({
    name: link.name.length > 10 ? `${link.name.substring(0, 10)}...` : link.name,
    clicks: link.clicks || 0,
    conversions: link.conversions || 0,
  }));

  if (links.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 h-80 flex items-center justify-center text-slate-400">
        No links available to chart.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Operational Performance</h3>
        <p className="text-xs text-slate-500">Comparison of Clicks and Conversions across Affiliate Links</p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ fontWeight: 'bold', color: '#cbd5e1' }}
            />
            <Area type="monotone" dataKey="clicks" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
            <Area type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConversions)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
