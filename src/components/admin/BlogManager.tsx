import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import {
  Plus,
  Trash2,
  Edit,
  Sparkles,
  BookOpen,
  Calendar,
  User,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Star,
  Info,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react";
import { uploadToCloudinary } from "../../services/cloudinaryService";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  featured?: boolean;
  content: string;
  createdAt?: string;
  bannerImage?: string;
}

const DEFAULT_POSTS = [
  {
    title: "How to Choose a Trusted Casino Broker in 2026",
    excerpt: "Navigating the online casino market can be complex. Learn how professional casino brokers evaluate security, licensing, payout speed, and cashback terms to protect your funds.",
    category: "Brokerage Guides",
    date: "July 2, 2026",
    author: "Eker Editorial",
    readTime: "5 min read",
    featured: true,
    content: "When it comes to high-stakes gaming, trust is everything. A professional casino broker acts as an intermediary, vetting platforms for licensing, game fairness, and prompt payout processing. This guide explores the critical checklist: checking Malta/Curacao registrations, verifying direct payout pipelines, understanding affiliate incentive structures, and ensuring your data remains encrypted and safe from bad actors."
  },
  {
    title: "Understanding Casino Cashback & Campaign Bonuses",
    excerpt: "Maximize your returns. Learn the difference between match bonuses, reload rewards, and lifetime wagering cashbacks, and how to spot wagering requirement traps.",
    category: "Bonuses & Promos",
    date: "June 28, 2026",
    author: "Anik Hoque",
    readTime: "4 min read",
    featured: false,
    content: "Not all bonuses are created equal. Many online platforms advertise massive match bonuses but hide strict 40x or 50x wagering requirements in the fine print. Standard brokers recommend looking for direct cashback programs (like 5-10% weekly wager cashback) or low-wagering reload deals that allow you to withdraw your earnings without complex playthrough obstacles."
  },
  {
    title: "Inside the Vetting Process: How We Audit Jackpot Submissions",
    excerpt: "Transparency is our foundation. A detailed breakdown of how our vetting desk validates screenshot proof, bet slips, and transaction logs before listing campaigns.",
    category: "Transparency",
    date: "June 15, 2026",
    author: "Security Desk",
    readTime: "6 min read",
    featured: false,
    content: "Every jackpot and Campaign proof listed on Eker Listings undergoes manual auditing. Our verification specialists examine high-resolution screenshot metadata, cross-reference transaction IDs on the blockchain or game logs, and contact casino operators directly. This painstaking vetting ensures our visitors only play verified winning campaigns."
  }
];

export function BlogManager({ deals = [] }: { deals?: any[] }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("Brokerage Guides");
  const [customCategory, setCustomCategory] = useState("");
  const [author, setAuthor] = useState("");
  const [readTime, setReadTime] = useState("");
  const [content, setContent] = useState("");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI Blog state
  const [selectedCasinoId, setSelectedCasinoId] = useState("");
  const [blogBannerUrl, setBlogBannerUrl] = useState("");
  const [generatingBlog, setGeneratingBlog] = useState(false);

  // Cloudinary / Complete Listing state
  const [allCasinos, setAllCasinos] = useState<any[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    // 1. Listen to dynamic blog posts
    const unsubscribeBlogs = onSnapshot(
      collection(db, "blogs"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as BlogPost[];
        
        // Sort by createdAt or date
        list.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load dynamic blog posts:", err);
        setError("Firestore rules blocked reading blog posts. Let's make sure rules are set.");
        setLoading(false);
      }
    );

    // 2. Real-time sync ALL affiliate/casino listings to populate dropdown
    const unsubscribeCasinos = onSnapshot(
      collection(db, "affiliateLinks"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          const raw = docSnap.data();
          list.push({
            id: docSnap.id,
            name: raw.title || raw.name || "",
            title: raw.title || raw.name || "",
            url: raw.originalUrl || raw.url || "",
            imageUrl: raw.imageUrl || raw.logoUrl || "",
            ...raw,
          });
        });
        setAllCasinos(list);
      },
      (err) => {
        console.error("Failed to sync complete casino list:", err);
      }
    );

    return () => {
      unsubscribeBlogs();
      unsubscribeCasinos();
    };
  }, []);

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true);
    setError("");
    setSuccess("");
    try {
      const uploadedUrl = await uploadToCloudinary(file, "banners");
      if (uploadedUrl) {
        setBlogBannerUrl(uploadedUrl);
        setSuccess("Banner uploaded and saved to Cloudinary successfully!");
      } else {
        throw new Error("Cloudinary upload did not return a valid secure URL.");
      }
    } catch (err: any) {
      console.error("Failed to upload banner to Cloudinary:", err);
      setError(`Banner upload failed: ${err.message || err}`);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPost(null);
    setTitle("");
    setExcerpt("");
    setCategory("Brokerage Guides");
    setCustomCategory("");
    setAuthor("Anik Hoque");
    setReadTime("5 min read");
    setContent("");
    setFeatured(false);
    setError("");
    setSuccess("");
    setSelectedCasinoId("");
    setBlogBannerUrl("");
    setIsFormOpen(true);
  };

  const handleCasinoSelection = (casinoId: string) => {
    setSelectedCasinoId(casinoId);
    const casinosSource = allCasinos.length > 0 ? allCasinos : deals;
    const deal = casinosSource.find((d) => d.id === casinoId);
    if (deal) {
      setBlogBannerUrl(deal.imageUrl || deal.logoUrl || "");
    } else {
      setBlogBannerUrl("");
    }
  };

  const generateAIBlog = async () => {
    const casinosSource = allCasinos.length > 0 ? allCasinos : deals;
    const deal = casinosSource.find((d) => d.id === selectedCasinoId);
    if (!deal) return;

    setGeneratingBlog(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/generate-casino-blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          casinoName: deal.name,
          affiliateLink: deal.url,
          welcomeBonus: deal.rewardText || deal.ownerRewardText || "",
          shortDescription: deal.description || "",
          bannerImage: blogBannerUrl || deal.imageUrl || deal.logoUrl || ""
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Backend returned an error.");
      }

      const data = await response.json();
      if (data.success) {
        setTitle(data.title || "");
        setExcerpt(data.excerpt || "");
        setCategory(data.category || "Brokerage Guides");
        setReadTime(data.readTime || "5 min read");
        setContent(data.content || "");
        setSuccess("SEO Blog post auto-generated! Review, edit, or adjust the contents below before publishing.");
      } else {
        throw new Error(data.error || "Failed to auto-generate blog post.");
      }
    } catch (err: any) {
      console.error("Failed to generate blog post via AI:", err);
      setError(`AI generation failed: ${err.message || err}. Falling back to manual entry.`);
    } finally {
      setGeneratingBlog(false);
    }
  };

  const handleOpenEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setExcerpt(post.excerpt);
    const standardCategories = ["Brokerage Guides", "Bonuses & Promos", "Transparency", "Tutorials"];
    if (standardCategories.includes(post.category)) {
      setCategory(post.category);
      setCustomCategory("");
    } else {
      setCategory("Custom");
      setCustomCategory(post.category);
    }
    setAuthor(post.author);
    setReadTime(post.readTime);
    setContent(post.content);
    setFeatured(post.featured || false);
    setError("");
    setSuccess("");
    setBlogBannerUrl(post.bannerImage || "");
    setSelectedCasinoId("");
    setIsFormOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt || !author || !content) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const finalCategory = category === "Custom" ? customCategory.trim() : category;
    if (!finalCategory) {
      setError("Please specify a category.");
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      category: finalCategory,
      author: author.trim(),
      readTime: readTime.trim(),
      content: content.trim(),
      featured,
      bannerImage: blogBannerUrl.trim(),
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      updatedAt: new Date().toISOString(),
    };

    try {
      // If we featured this one, unfeature others (optional helper)
      if (featured) {
        const batch = writeBatch(db);
        posts.forEach((p) => {
          if (p.featured && p.id !== editingPost?.id) {
            batch.update(doc(db, "blogs", p.id), { featured: false });
          }
        });
        // We will commit the updates but write the current doc normally
        await batch.commit();
      }

      if (editingPost) {
        await updateDoc(doc(db, "blogs", editingPost.id), payload);
        setSuccess("Blog post updated successfully!");
      } else {
        await addDoc(collection(db, "blogs"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        setSuccess("New blog post published successfully!");
      }

      setIsFormOpen(false);
    } catch (err: any) {
      console.error("Error saving blog post:", err);
      setError("Permission denied. Ensure Firestore security rules permit writes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (id: string, postTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the blog post "${postTitle}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "blogs", id));
      setSuccess("Blog post deleted successfully.");
    } catch (err) {
      console.error("Error deleting blog post:", err);
      setError("Failed to delete blog post.");
    }
  };

  const handleImportDefaults = async () => {
    if (!window.confirm("Do you want to seed the database with the default blog posts?")) {
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_POSTS.forEach((p) => {
        const ref = doc(collection(db, "blogs"));
        batch.set(ref, {
          ...p,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      setSuccess("Default blog posts imported successfully!");
    } catch (err) {
      console.error("Error importing defaults:", err);
      setError("Failed to import default posts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Dynamic Blog & Article Manager
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Publish guides, promotional campaign articles, and brokerage updates. These render instantly on the dynamic Blog page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {posts.length === 0 && !loading && (
            <button
              onClick={handleImportDefaults}
              className="px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Import Default Posts</span>
            </button>
          )}
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Article</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="ml-auto text-emerald-400 hover:text-emerald-600 font-extrabold">&times;</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-rose-600 font-extrabold">&times;</button>
        </div>
      )}

      {/* Editor Form Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingPost ? "Edit Blog Article" : "Write New Blog Article"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-4">
              {/* AI SEO Auto-Generator desk */}
              {!editingPost && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>AI SEO Auto-Generator Desk (No Client API Keys)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Select a listed Casino brand and provide an optional campaign banner. The cloud-side AI will instantly compile a high-converting, search-engine-optimized article with built-in referral backlinks.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Select Casino Brand
                      </label>
                      <select
                        value={selectedCasinoId}
                        onChange={(e) => handleCasinoSelection(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Choose Listed Casino --</option>
                        {(allCasinos.length > 0 ? allCasinos : deals).map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            {deal.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Campaign Banner Image URL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. https://domain.com/banner.jpg"
                        value={blogBannerUrl}
                        onChange={(e) => setBlogBannerUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  {selectedCasinoId && (
                    <div className="pt-2 flex items-center justify-between border-t border-indigo-100/50">
                      <span className="text-[9px] text-slate-500 font-medium">
                        Referral Backlink: <span className="font-mono font-bold text-indigo-600 break-all">{(allCasinos.length > 0 ? allCasinos : deals).find(d => d.id === selectedCasinoId)?.url}</span>
                      </span>
                      <button
                        type="button"
                        disabled={generatingBlog}
                        onClick={generateAIBlog}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {generatingBlog ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Crafting SEO copy...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Generate SEO Post & Backlinks</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. How to Choose a Trusted Casino Broker in 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Short Excerpt / Summary *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Provide a brief summary of the post to show in catalog views..."
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 resize-none"
                  />
                </div>

                {/* Article Banner Image Uploader block */}
                <div className="sm:col-span-2 border border-slate-100 bg-slate-50/55 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Article Banner Image *
                    </label>
                    {blogBannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBlogBannerUrl("")}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Drag & Drop File Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          await handleBannerUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                        dragActive 
                          ? "border-indigo-500 bg-indigo-50/50" 
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                      onClick={() => document.getElementById("banner-file-input")?.click()}
                    >
                      <input
                        type="file"
                        id="banner-file-input"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            await handleBannerUpload(e.target.files[0]);
                          }
                        }}
                      />
                      {uploadingBanner ? (
                        <div className="flex flex-col items-center justify-center space-y-2 py-2">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <span className="text-[11px] font-bold text-slate-500">Saving to Cloudinary...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1.5 py-2">
                          <UploadCloud className="w-7 h-7 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-700">
                            {dragActive ? "Drop image here" : "Upload Banner Image"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Supports PNG, JPG, WEBP (Max 5MB)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Manual URL Input or Preview */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                          Or Enter Banner Image URL manually
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. https://domain.com/banner.jpg"
                          value={blogBannerUrl}
                          onChange={(e) => setBlogBannerUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
                        />
                      </div>

                      {blogBannerUrl && (
                        <div className="relative h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
                          <img
                            src={blogBannerUrl}
                            alt="Banner Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <span className="text-[10px] text-white font-bold bg-slate-900/75 px-2.5 py-1 rounded-md">
                              Banner Active
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category Type *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  >
                    <option value="Brokerage Guides">Brokerage Guides</option>
                    <option value="Bonuses & Promos">Bonuses & Promos</option>
                    <option value="Transparency">Transparency</option>
                    <option value="Tutorials">Tutorials</option>
                    <option value="Custom">Custom / Enter category</option>
                  </select>
                </div>

                {category === "Custom" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Enter Custom Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Market Trends"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Author / Writer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anik Hoque"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Estimate Read Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 min read"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center gap-2 p-1 pt-4">
                  <input
                    type="checkbox"
                    id="featured-checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="featured-checkbox" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Set as Featured Article (places in hero section)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Article Body Content *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Write full editorial contents of your dynamic article..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingPost ? "Save Changes" : "Publish Article"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blogs list catalog table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-10 h-10 text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No dynamic blog posts found</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Seeding database allows users to customize contents. Click "Import Default Posts" above to load the initial dataset.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Writer</th>
                  <th className="px-5 py-3">Read Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 max-w-xs sm:max-w-md">
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-900 break-words line-clamp-1">
                          {post.title}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 font-semibold">
                          {post.excerpt}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{post.author}</td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-[11px]">{post.readTime}</td>
                    <td className="px-5 py-4">
                      {post.featured ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-amber-200">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          Featured
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">Standard</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(post)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit Article"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id, post.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Delete Article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
