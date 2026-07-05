import React, { useState, useEffect } from 'react';
import { Save, ShieldAlert, Globe, Upload, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '../../services/cloudinaryService';

// @ts-ignore
import defaultDemoScreenshot from '../../assets/images/demo_screenshot_1783151508532.jpg';
// @ts-ignore
import defaultDemoBalance from '../../assets/images/demo_balance_1783152014334.jpg';

export const Settings: React.FC = () => {
  const [siteName, setSiteName] = useState('Eker Casino Affiliate');
  const [siteDesc, setSiteDesc] = useState('Premium AI-Powered Online Casino Listing');
  const [contactEmail, setContactEmail] = useState('aminulhoqueanik@gmail.com');
  const [maintenance, setMaintenance] = useState(false);
  const [demoScreenshotUrl, setDemoScreenshotUrl] = useState('');
  const [demoBalanceUrl, setDemoBalanceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [uploadingBalance, setUploadingBalance] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load configuration on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'system_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.siteName) setSiteName(data.siteName);
          if (data.siteDesc) setSiteDesc(data.siteDesc);
          if (data.contactEmail) setContactEmail(data.contactEmail);
          if (data.maintenance !== undefined) setMaintenance(data.maintenance);
          if (data.demoScreenshotUrl) setDemoScreenshotUrl(data.demoScreenshotUrl);
          if (data.demoBalanceUrl) setDemoBalanceUrl(data.demoBalanceUrl);
        }
      } catch (err) {
        console.error('Error fetching system settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const docRef = doc(db, 'settings', 'system_config');
      await setDoc(docRef, {
        siteName,
        siteDesc,
        contactEmail,
        maintenance,
        demoScreenshotUrl: demoScreenshotUrl || defaultDemoScreenshot,
        demoBalanceUrl: demoBalanceUrl || defaultDemoBalance,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setStatusMessage({ type: 'success', text: 'System Settings successfully saved to Firebase!' });
    } catch (err: any) {
      console.error('Error saving system settings:', err);
      setStatusMessage({ type: 'error', text: `Failed to save settings: ${err.message || err}` });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'screenshot' | 'balance') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'screenshot') setUploadingScreenshot(true);
    else setUploadingBalance(true);
    setStatusMessage(null);
    try {
      const uploadedUrl = await uploadToCloudinary(file, 'user-submissions', file.name);
      if (target === 'screenshot') {
        setDemoScreenshotUrl(uploadedUrl);
        setStatusMessage({ type: 'success', text: 'Demo screenshot uploaded to Cloudinary successfully!' });
      } else {
        setDemoBalanceUrl(uploadedUrl);
        setStatusMessage({ type: 'success', text: 'Demo balance uploaded to Cloudinary successfully!' });
      }
    } catch (err: any) {
      console.error(`Failed to upload demo ${target}:`, err);
      setStatusMessage({ type: 'error', text: `Upload failed: ${err.message || err}` });
    } finally {
      setUploadingScreenshot(false);
      setUploadingBalance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-semibold gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> General Site Configurations
          </h3>
          <p className="text-xs text-slate-500">Configure global metadata, contacts, and assets for Eker Casino Affiliate Platform</p>
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

        {/* Demo Screenshot URL Config */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-500" /> Jackpot Demo Screenshot Image (ডেমো স্ক্রিনশট ইমেজ)
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-32 h-44 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center group flex-shrink-0">
              <img
                src={demoScreenshotUrl || defaultDemoScreenshot}
                alt="Demo Screenshot"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {uploadingScreenshot && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold">
                  Uploading...
                </div>
              )}
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                উইনারদের Jackpot Winning Screenshot আপলোড করার পেইজে এই ডেমো স্ক্রিনশটটি পপআপ হিসেবে দেখাবে। 
                এডমিন প্যানেল থেকে এখানে নতুন ইমেজ আপলোড করে এটি সহজেই পরিবর্তন করা যাবে।
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl cursor-pointer transition">
                  <Upload className="w-4 h-4" /> Change Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'screenshot')}
                    className="hidden"
                  />
                </label>
                {demoScreenshotUrl && (
                  <button
                    type="button"
                    onClick={() => setDemoScreenshotUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Balance URL Config */}
        <div className="space-y-2 border-t border-slate-100 pt-6">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-500" /> Account Balance Demo Screenshot Image (ব্যালেন্স স্ক্রিনশট ডেমো ইমেজ)
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-32 h-44 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center group flex-shrink-0">
              <img
                src={demoBalanceUrl || defaultDemoBalance}
                alt="Demo Balance Screenshot"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {uploadingBalance && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold">
                  Uploading...
                </div>
              )}
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                উইনারদের Account Profile/Balance Screenshot আপলোড করার পেইজে এই ডেমো স্ক্রিনশটটি পপআপ হিসেবে দেখাবে। 
                এডমিন প্যানেল থেকে এখানে নতুন ইমেজ আপলোড করে এটি সহজেই পরিবর্তন করা যাবে।
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl cursor-pointer transition">
                  <Upload className="w-4 h-4" /> Change Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'balance')}
                    className="hidden"
                  />
                </label>
                {demoBalanceUrl && (
                  <button
                    type="button"
                    onClick={() => setDemoBalanceUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

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
