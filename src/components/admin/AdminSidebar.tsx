import React from 'react';
import {
  LayoutDashboard,
  Link2,
  Settings,
  Users,
  Image as ImageIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  TrendingUp,
  Percent,
  ShieldCheck,
  LineChart,
  X,
  Sparkles,
  BookOpen,
  Mail,
  Palette,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layout,
  Menu,
  FileText,
  Trophy,
  Wallet,
  UserCog
} from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = React.useState(() => {
    return currentTab.startsWith('theme-editor');
  });

  // Automatically keep the dropdown open if the active tab is one of the theme-editor sub-tabs
  React.useEffect(() => {
    if (currentTab.startsWith('theme-editor')) {
      setIsThemeDropdownOpen(true);
    }
  }, [currentTab]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'ai-agent', label: 'AI Agent Manager', icon: Sparkles },
    { id: 'casinos', label: 'Casino Listings', icon: Building2 },
    { id: 'bonuses', label: 'Campaign Bonuses', icon: Percent },
    { id: 'review-submission', label: 'Review Submission', icon: ShieldCheck },
    { id: 'sell-requests', label: 'Sell Requests', icon: TrendingUp },
    { id: 'withdrawals', label: 'Withdrawal Requests', icon: Wallet },
    { id: 'blogs', label: 'Manage Blogs', icon: BookOpen },
    { id: 'contact-desk', label: 'Contact Inbox', icon: Mail },
    { id: 'banners', label: 'Content Manager', icon: ImageIcon },
    { id: 'theme-editor', label: 'Theme Editor', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'users', label: 'User Manager', icon: Users },
  ];

  const themeSubItems = [
    { id: 'theme-editor-global', label: 'Global setting', icon: Settings },
    { id: 'theme-editor-menu', label: 'Menu items', icon: Menu },
    { id: 'theme-editor-category', label: 'Category manager', icon: Sliders },
    { id: 'theme-editor-home', label: 'Home page editor', icon: Layout },
    { id: 'theme-editor-most-winning', label: 'Most Winning Games', icon: Trophy },
    { id: 'theme-editor-casino', label: 'Single casino page editor', icon: Building2 },
    { id: 'theme-editor-blog', label: 'Blog page editor', icon: FileText },
    { id: 'theme-editor-single-blog', label: 'Single Blog page editor', icon: BookOpen },
    { id: 'theme-editor-contact', label: 'Contact page editor', icon: Mail },
  ];


  return (
    <>
      {/* Backdrop for Mobile overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-all duration-300"
        />
      )}

      <aside
        className={`bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 h-screen shrink-0
          fixed md:sticky top-0 left-0 z-50
          ${isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          {(!isCollapsed || isOpenMobile) && (
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Eker Admin
            </span>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {/* Close Mobile Button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isThemeEditorParent = item.id === 'theme-editor';
            const isActive = isThemeEditorParent 
              ? currentTab.startsWith('theme-editor')
              : currentTab === item.id;
            
            if (isThemeEditorParent) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setIsThemeDropdownOpen(!isThemeDropdownOpen);
                      // If not already in theme editor, go to main theme editor page (launcher hub)
                      if (!currentTab.startsWith('theme-editor')) {
                        onTabChange('theme-editor');
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer
                      ${isActive
                        ? 'bg-indigo-650 text-white shadow-sm'
                        : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                      }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {(!isCollapsed || isOpenMobile) && <span className="truncate">{item.label}</span>}
                    </div>
                    {(!isCollapsed || isOpenMobile) && (
                      isThemeDropdownOpen ? <ChevronUp className="w-4 h-4 text-indigo-300" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Collapsible Dropdown Items */}
                  {isThemeDropdownOpen && (!isCollapsed || isOpenMobile) && (
                    <div className="pl-4 space-y-1 mt-1 border-l border-slate-800 ml-6">
                      {themeSubItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = currentTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              onTabChange(subItem.id);
                              if (onCloseMobile) onCloseMobile();
                            }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left
                              ${isSubActive
                                ? 'bg-slate-800 text-indigo-400 font-bold border border-slate-700'
                                : 'hover:bg-slate-800/40 hover:text-slate-200 text-slate-400'
                              }`}
                          >
                            <SubIcon className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                            <span className="truncate">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isOpenMobile) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => {
              onLogout();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-rose-950/30 hover:text-rose-400 text-slate-400 cursor-pointer"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(!isCollapsed || isOpenMobile) && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
