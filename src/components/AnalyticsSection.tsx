import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { AffiliateLink } from "../types";
import { Link2, Award, MousePointerClick, ShieldAlert } from "lucide-react";

interface AnalyticsSectionProps {
  deals: AffiliateLink[];
}

const COLORS = ["#059669", "#4f46e5", "#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"];

export default function AnalyticsSection({ deals }: AnalyticsSectionProps) {
  // 1. Calculate general stats
  const totalOffers = deals.length;
  const activeOffers = deals.filter(d => !d.isArchived).length;
  const totalClicks = deals.reduce((sum, d) => sum + (d.clicks || 0), 0);
  const averageClicks = totalOffers > 0 ? (totalClicks / totalOffers).toFixed(1) : "0";

  // 2. Prepare Top Performing Links Data for BarChart (take top 6)
  const barChartData = [...deals]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6)
    .map(d => ({
      name: d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title,
      Clicks: d.clicks,
    }));

  // 3. Prepare Clicks by Category Data for PieChart
  const categoryClicksMap: Record<string, number> = {};
  deals.forEach(d => {
    const cat = d.category || "General";
    categoryClicksMap[cat] = (categoryClicksMap[cat] || 0) + d.clicks;
  });

  const pieChartData = Object.keys(categoryClicksMap)
    .map(name => ({
      name,
      value: categoryClicksMap[name],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* 4 Stats Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Links</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Link2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-800">{activeOffers}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Total registered rewards active</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Referrals</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <MousePointerClick className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-800">{totalClicks}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Visits routed & logged</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Performance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-800">{averageClicks}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Clicks per active link</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Program Slots</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-800">{totalOffers}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Including archived profiles</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Panel */}
      {totalClicks === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <p className="text-sm font-medium text-slate-500">
            No click analytics are recorded yet. Share your links to track real-time visual statistics!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart: top links */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
            <h4 className="font-display font-bold text-slate-800 text-sm mb-4">
              Top Referring Programs (Clicks)
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", color: "#fff", borderRadius: "12px", border: "none" }}
                    itemStyle={{ color: "#10b981" }}
                  />
                  <Bar dataKey="Clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: categories */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex flex-col justify-between">
            <h4 className="font-display font-bold text-slate-800 text-sm mb-2">
              Performance by Categories
            </h4>
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", color: "#fff", borderRadius: "12px", border: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legends list */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-50">
              {pieChartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5 text-slate-600 truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-slate-400 font-mono">({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
