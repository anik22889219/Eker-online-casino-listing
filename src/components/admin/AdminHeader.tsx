import React from 'react';
import { User, Bell, Menu } from 'lucide-react';

interface AdminHeaderProps {
  userEmail?: string | null;
  role?: string;
  title: string;
  photoURL?: string | null;
  onToggleSidebar?: () => void;
  onProfileClick?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  userEmail,
  role,
  title,
  photoURL,
  onToggleSidebar,
  onProfileClick,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between shrink-0">
      {/* Dynamic Title with Hamburger on Mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm md:text-lg font-bold text-slate-900 tracking-tight line-clamp-1">{title}</h2>
        </div>
      </div>

      {/* Right User Bar */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg relative transition cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* User Info (Clickable Profile Avatar) */}
        <button
          onClick={onProfileClick}
          className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100 transition cursor-pointer text-left group"
          title="Click to view & edit Admin Profile"
        >
          <div className="relative">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Admin Profile"
                className="w-9 h-9 rounded-full object-cover border border-indigo-200 shadow-2xs group-hover:ring-2 group-hover:ring-indigo-500 transition"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-2xs group-hover:ring-2 group-hover:ring-indigo-500 transition">
                {userEmail ? userEmail[0].toUpperCase() : <User className="w-5 h-5" />}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 max-w-[150px] truncate group-hover:text-indigo-600 transition">
              {userEmail || 'Admin User'}
            </p>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              {role || 'Administrator'}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
};
