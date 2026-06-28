import React from 'react';
import { LayoutDashboard, Link2, Settings, Users, Image as ImageIcon, LogOut, ChevronLeft, ChevronRight, Building2, TrendingUp, Percent, ShieldCheck, LineChart } from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onTabChange,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'casinos', label: 'Casino Listings', icon: Building2 },
    { id: 'bonuses', label: 'Campaign Bonuses', icon: Percent },
    { id: 'moderation', label: 'Vetting Desk', icon: ShieldCheck },
    { id: 'casino-analytics', label: 'Casino Analytics', icon: LineChart },
    { id: 'sell-requests', label: 'Sell Requests', icon: TrendingUp },
    { id: 'links', label: 'Affiliate Links', icon: Link2 },
    { id: 'banners', label: 'Promo Banners', icon: ImageIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'users', label: 'User Manager', icon: Users },
  ];

  return (
    <aside 
      className={`bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 h-full relative
        ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Eker Admin
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition ml-auto"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-rose-950/30 hover:text-rose-400 text-slate-400`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
