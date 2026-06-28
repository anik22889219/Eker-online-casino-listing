import React, { useState } from 'react';
import { Save, ShieldAlert, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const Settings: React.FC = () => {
  const [siteName, setSiteName] = useState('Eker Casino Affiliate');
  const [siteDesc, setSiteDesc] = useState('Premium AI-Powered Online Casino Listing');
  const [contactEmail, setContactEmail] = useState('aminulhoqueanik@gmail.com');
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved successfully!');
    }, 1000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> General Site Configurations
          </h3>
          <p className="text-xs text-slate-500">Configure global metadata and contacts for Eker Casino Affiliate Platform</p>
        </div>

        <Input
          label="Website Name"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="e.g., Eker Online Casino Listing"
        />

        <Input
          label="SEO Meta Description"
          value={siteDesc}
          onChange={(e) => setSiteDesc(e.target.value)}
          placeholder="e.g., The best casino reviews..."
        />

        <Input
          label="Support Contact Email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="support@domain.com"
        />

        {/* Maintenance Mode */}
        <div className="flex items-start gap-4 p-4 rounded-xl border border-rose-100 bg-rose-50/20">
          <ShieldAlert className="w-6 h-6 text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-950">System Maintenance Mode</h4>
            <p className="text-xs text-rose-800/80 mt-1 mb-3">
              Activating maintenance mode takes the public-facing casino catalog offline. Only administrators can bypass this state.
            </p>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-rose-950">Enable Maintenance Mode</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100">
          <Button type="submit" loading={saving} className="gap-2">
            <Save className="w-4 h-4" /> Save System Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
