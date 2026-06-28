import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Power, QrCode, Globe } from 'lucide-react';
import { AffiliateLink } from '../../types';
import { Button } from '../ui/Button';
import { QRCodeSVG } from 'qrcode.react';

interface LinksTableProps {
  links: AffiliateLink[];
  onEdit: (link: AffiliateLink) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (link: AffiliateLink) => void;
  onAddNew: () => void;
}

export const LinksTable: React.FC<LinksTableProps> = ({
  links,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [qrLink, setQrLink] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(links.map(l => l.category).filter(Boolean)))];

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          link.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || link.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
          >
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <Button onClick={onAddNew} size="sm" className="self-start md:self-auto gap-2">
          <Plus className="w-4 h-4" /> Add New Link
        </Button>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 tracking-wider">
              <th className="px-6 py-4">Casino / Deal Name</th>
              <th className="px-6 py-4">URL & Category</th>
              <th className="px-6 py-4">Commission</th>
              <th className="px-6 py-4 text-center">Clicks</th>
              <th className="px-6 py-4 text-center">Conversions</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No affiliate links found matching current criteria.
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/50 transition duration-150">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      {link.imageUrl ? (
                        <img 
                          src={link.imageUrl} 
                          alt={link.name} 
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                          {link.name.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="text-slate-950 font-semibold">{link.name}</p>
                        {link.lastClicked && (
                          <p className="text-[10px] text-slate-400 font-normal">
                            Last click: {new Date(link.lastClicked).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 max-w-[180px] truncate">{link.url}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-sm">
                      {link.category || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-indigo-600">
                    {link.commission}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-medium text-slate-700">
                    {link.clicks || 0}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-medium text-slate-700">
                    {link.conversions || 0}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border
                      ${link.status === 'active' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {link.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Toggle status */}
                      <button
                        onClick={() => onToggleStatus(link)}
                        className={`p-1.5 rounded-lg border transition ${
                          link.status === 'active' 
                            ? 'text-amber-600 hover:bg-amber-50 border-slate-200' 
                            : 'text-emerald-600 hover:bg-emerald-50 border-slate-200'
                        }`}
                        title={link.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      {/* QR Code */}
                      <button
                        onClick={() => setQrLink(qrLink === link.id ? null : link.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                        title="View QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEdit(link)}
                        className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition"
                        title="Edit details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(link.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* QR Code mini popover */}
                    {qrLink === link.id && (
                      <div className="absolute right-6 mt-2 z-20 bg-white border border-slate-200 rounded-xl p-4 shadow-xl flex flex-col items-center gap-3">
                        <p className="text-xs font-bold text-slate-800">Scan QR to Visit</p>
                        <QRCodeSVG value={link.url} size={110} />
                        <button 
                          onClick={() => setQrLink(null)}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
