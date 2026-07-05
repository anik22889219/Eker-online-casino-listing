import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import {
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  UploadCloud,
  X,
  Link2,
  Layers,
  Image as ImageIcon,
} from "lucide-react";

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  status: "active" | "draft";
  createdAt: any;
}

export const BannersManager: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [status, setStatus] = useState<"active" | "draft">("active");

  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "banners"),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Banner[];
        setBanners(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching banners:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const url = await uploadToCloudinary(file, "banners", file.name);
      setBannerPreview(url);
      setSuccessMsg("Banner image uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Image upload failed: ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !bannerPreview) {
      setErrorMsg("Title and Banner Image are required.");
      return;
    }

    setFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let finalTargetUrl = targetUrl.trim();
    if (finalTargetUrl && !/^https?:\/\//i.test(finalTargetUrl)) {
      finalTargetUrl = `https://${finalTargetUrl}`;
    }

    try {
      await addDoc(collection(db, "banners"), {
        title: title.trim(),
        imageUrl: bannerPreview,
        targetUrl: finalTargetUrl,
        status,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("Promo banner created successfully!");
      setTitle("");
      setTargetUrl("");
      setBannerPreview("");
      setStatus("active");
      setIsAdding(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create banner");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    const newStatus = banner.status === "active" ? "draft" : "active";
    try {
      await updateDoc(doc(db, "banners", banner.id), {
        status: newStatus,
      });
      setSuccessMsg(`Banner set to ${newStatus}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to update status");
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!window.confirm(`Are you sure you want to delete banner "${banner.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "banners", banner.id));
      setSuccessMsg("Banner deleted successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to delete banner");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Promo Banners Manager
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage large promotional cards, landing deals, and rotating home banner campaigns.
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Banner</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {(successMsg || errorMsg) && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 ${
            errorMsg ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {errorMsg ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-emerald-600" />}
          <span className="text-xs font-bold flex-1">{successMsg || errorMsg}</span>
          <button onClick={() => { setSuccessMsg(null); setErrorMsg(null); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <h4 className="text-sm font-extrabold text-slate-800">Add Promo Campaign Banner</h4>
            <button onClick={() => setIsAdding(false)} className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Campaign / Offer Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mega Welcome Pack - Spin & Win!"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Referral / Destination URL (Optional)
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://stake.com/?c=refdirect"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 bg-slate-50/50 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Publish Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("active")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      status === "active" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("draft")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      status === "draft" ? "bg-slate-50 border-slate-300 text-slate-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Upload Image Banner *
                </label>
                <label className="flex items-center justify-center h-10 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer hover:bg-slate-50/50 transition">
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                      <UploadCloud className="w-4 h-4 text-slate-400" />
                      <span>Choose Banner File</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                </label>
              </div>
            </div>

            {bannerPreview && (
              <div className="border border-slate-200 rounded-xl overflow-hidden relative group max-h-48 bg-slate-950">
                <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-contain mx-auto" />
                <button
                  type="button"
                  onClick={() => setBannerPreview("")}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-950 text-white rounded-full transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading || isUploading || !bannerPreview}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Publish Promo Banner</span>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner list */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Active Campaigns ({banners.length})</h4>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
            <ImageIcon className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">No active promo banners found.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click Create Promo Banner to set up your first home campaign.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between bg-slate-50/30 shadow-xs hover:border-slate-300 transition-all">
                <div className="relative h-40 bg-slate-950 overflow-hidden group">
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-102" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span
                      onClick={() => handleToggleStatus(banner)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase cursor-pointer border shadow-xs transition-all ${
                        banner.status === "active"
                          ? "bg-emerald-500/90 border-emerald-400 text-white"
                          : "bg-slate-700/90 border-slate-600 text-slate-200"
                      }`}
                    >
                      {banner.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h5 className="font-extrabold text-slate-900 text-xs line-clamp-1">{banner.title}</h5>
                  {banner.targetUrl && (
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold truncate">
                      <Link2 className="w-3.5 h-3.5" />
                      <a href={banner.targetUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {banner.targetUrl}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-150">
                    <span className="text-[9px] text-slate-400 font-bold">
                      {banner.createdAt ? new Date(banner.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                    </span>

                    <button
                      onClick={() => handleDelete(banner)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-150 transition cursor-pointer"
                      title="Delete banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
