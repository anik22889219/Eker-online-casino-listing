import React, { useState } from 'react';
import { Users, Search, Shield, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface UserItem {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
}

export const UserManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserItem[]>([
    { uid: '1', email: 'aminulhoqueanik@gmail.com', displayName: 'Aminul Hoque', role: 'admin', status: 'active' },
    { uid: '2', email: 'moderator@eker.com', displayName: 'Eker Mod', role: 'admin', status: 'active' },
    { uid: '3', email: 'playerone@gmail.com', displayName: 'Lucky Spinner', role: 'user', status: 'active' },
    { uid: '4', email: 'jackpot_chaser@yahoo.com', displayName: 'HighRoller99', role: 'user', status: 'active' },
  ]);

  const handleToggleRole = (uid: string) => {
    setUsers(users.map(u => {
      if (u.uid === uid) {
        return { ...u, role: u.role === 'admin' ? 'user' : 'admin' };
      }
      return u;
    }));
  };

  const handleToggleStatus = (uid: string) => {
    setUsers(users.map(u => {
      if (u.uid === uid) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    }));
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Search Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user accounts by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total Users: {users.length}
          </span>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 tracking-wider">
                <th className="px-6 py-4">Display Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4 text-center">System Role</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{user.displayName}</td>
                  <td className="px-6 py-4 font-mono text-xs">{user.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                      ${user.role === 'admin' 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border
                      ${user.status === 'active' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                    >
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggleRole(user.uid)}
                      >
                        Change Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-xs ${user.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        onClick={() => handleToggleStatus(user.uid)}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
