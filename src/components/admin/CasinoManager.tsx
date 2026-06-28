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
  query,
  where,
} from "firebase/firestore";
import { generateCasinoContent } from "../../firebase/cloudFunctions";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Star,
  Globe,
  UploadCloud,
  FileText,
  Bookmark,
  Share2,
  Grid,
  List,
  RefreshCw,
  Archive,
  ArrowUpRight,
  Filter,
  Layers,
  ChevronDown,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// Types matching firestore schemas
interface Casino {
  id: string;
  slug: string;
  affiliateLink: string;
  casinoName: string;
  casinoLogo: string;
  bannerImage: string;
  shortDescription: string;
  landingContent: string;
  manualReview: string;
  welcomeBonus: string;
  category: string;
  country: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  status: "draft" | "ai_generated" | "pending_review" | "published" | "archived";
  logoStatus?: "missing" | "found";
  aiGenerated: boolean;
  featured: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: any;
  updatedAt: any;
  isDeleted?: boolean;
}

interface SellRequest {
  id: string;
  status: string;
}

interface UserProfile {
  id: string;
}

// Client-side image optimization helper
const optimizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          "image/jpeg",
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const CasinoManager: React.FC = () => {
  // Collection States
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [sellRequestsCount, setSellRequestsCount] = useState<number>(0);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMenuOpen, setBulkMenuOpen] = useState<boolean>(false);

  // Active Modes
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingCasino, setEditingCasino] = useState<Casino | null>(null);
  const [previewCasino, setPreviewCasino] = useState<Casino | null>(null);

  // Creating Casino state (Affiliate Link + Banner only!)
  const [newAffiliateLink, setNewAffiliateLink] = useState<string>("");
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newBannerPreview, setNewBannerPreview] = useState<string>("");
  const [newBannerUploading, setNewBannerUploading] = useState<boolean>(false);
  const [triggerAiOnCreate, setTriggerAiOnCreate] = useState<boolean>(true);

  // Editing Form State
  const [editTab, setEditTab] = useState<"general" | "images" | "content" | "seo" | "preview">("general");
  const [editFields, setEditFields] = useState<Partial<Casino>>({});
  const [editKeywordsInput, setEditKeywordsInput] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingBanner, setUploadingBanner] = useState<boolean>(false);

  // Action Flags
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Real-time Subscriptions
  useEffect(() => {
    // 1. Casinos Subscription (exclude soft deleted)
    const unsubCasinos = onSnapshot(collection(db, "casinos"), (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Casino))
        .filter((c) => !c.isDeleted);
      setCasinos(docs);
      setLoading(false);
    }, (err) => {
      console.error("Casinos sub error:", err);
      setLoading(false);
    });

    // 2. Sell Requests Count Subscription
    const unsubSell = onSnapshot(collection(db, "sellRequests"), (snap) => {
      setSellRequestsCount(snap.size);
    });

    // 3. Users Count Subscription
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setTotalUsersCount(snap.size);
    });

    return () => {
      unsubCasinos();
      unsubSell();
      unsubUsers();
    };
  }, []);

  // Helper for generating dynamic list filters
  const categories = ["all", ...Array.from(new Set(casinos.map((c) => c.category).filter(Boolean)))];
  const countries = ["all", ...Array.from(new Set(casinos.map((c) => c.country).filter(Boolean)))];

  // Stats Counters
  const statTotal = casinos.length;
  const statPublished = casinos.filter((c) => c.status === "published").length;
  const statDraft = casinos.filter((c) => c.status === "draft").length;
  const statAiGenerated = casinos.filter((c) => c.aiGenerated || c.status === "ai_generated").length;
  const statPendingReview = casinos.filter((c) => c.status === "pending_review").length;

  // Search and Filtering Logic
  const filteredCasinos = casinos.filter((c) => {
    const matchesSearch =
      c.casinoName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.affiliateLink?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.country?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "ai_generated" && (c.status === "ai_generated" || c.aiGenerated)) ||
      c.status === statusFilter;

    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    const matchesCountry = countryFilter === "all" || c.country === countryFilter;
    const matchesFeatured =
      featuredFilter === "all" ||
      (featuredFilter === "featured" && c.featured) ||
      (featuredFilter === "standard" && !c.featured);

    return matchesSearch && matchesStatus && matchesCategory && matchesCountry && matchesFeatured;
  });

  // Handle Multi-Select checkbox click
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCasinos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCasinos.map((c) => c.id));
    }
  };

  // Image upload handles
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "newBanner" | "logo" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size and file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    try {
      if (type === "newBanner") {
        setNewBannerFile(file);
        setNewBannerPreview(URL.createObjectURL(file));
      } else if (type === "logo") {
        setUploadingLogo(true);
        // Optimize logo (max 400x400)
        const optimized = await optimizeImage(file, 400, 400);
        const url = await uploadToCloudinary(optimized, "logos", file.name);
        setEditFields((prev) => ({ ...prev, casinoLogo: url }));
        setFormSuccess("Logo uploaded and optimized successfully to Cloudinary!");
      } else if (type === "banner") {
        setUploadingBanner(true);
        // Optimize banner (max 1600x900)
        const optimized = await optimizeImage(file, 1600, 900);
        const url = await uploadToCloudinary(optimized, "banners", file.name);
        setEditFields((prev) => ({ ...prev, bannerImage: url }));
        setFormSuccess("Banner uploaded and optimized successfully to Cloudinary!");
      }
    } catch (err: any) {
      console.error("File upload failed:", err);
      setFormError(`Image upload failed: ${err.message || err}`);
    } finally {
      setUploadingLogo(false);
      setUploadingBanner(false);
    }
  };

  // Create Casino Draft (Affiliate Link + Banner)
  const handleCreateCasino = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newAffiliateLink.trim()) {
      setFormError("Affiliate landing link is required.");
      return;
    }

    // Basic URL validation
    try {
      new URL(newAffiliateLink);
    } catch (_) {
      setFormError("Please enter a valid affiliate URL (e.g., https://example.com)");
      return;
    }

    setFormLoading(true);

    try {
      let bannerUrl = "";
      if (newBannerFile) {
        setNewBannerUploading(true);
        const optimized = await optimizeImage(newBannerFile, 1600, 900);
        bannerUrl = await uploadToCloudinary(optimized, "banners", newBannerFile.name);
      }

      if (triggerAiOnCreate) {
        // Trigger Server AI flow
        setFormSuccess("Triggering Gemini 2.5 Flash crawler... please wait.");
        const aiResponse = await generateCasinoContent(newAffiliateLink, bannerUrl);

        if (aiResponse.success) {
          // Fetch newly created casino to launch edit screen
          const newDocRef = doc(db, "casinos", aiResponse.casinoId);
          onSnapshot(newDocRef, (snap) => {
            if (snap.exists()) {
              const createdCasino = { id: snap.id, ...snap.data() } as Casino;
              setEditingCasino(createdCasino);
              setEditFields(createdCasino);
              setEditKeywordsInput(createdCasino.keywords?.join(", ") || "");
              setIsAdding(false);
              setNewAffiliateLink("");
              setNewBannerFile(null);
              setNewBannerPreview("");
              setFormSuccess(`AI content generated perfectly for "${createdCasino.casinoName}"! Draft loaded.`);
            }
          });
        } else {
          throw new Error("AI Content generator returned an unsuccessful state.");
        }
      } else {
        // Manual blank draft creation
        const urlObj = new URL(newAffiliateLink);
        const rawHost = urlObj.hostname.replace("www.", "");
        const tempName = rawHost.split(".")[0];
        const initialSlug = tempName.toLowerCase().replace(/[^a-z0-9-]/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

        const newDraft: Omit<Casino, "id"> = {
          slug: initialSlug,
          affiliateLink: newAffiliateLink,
          casinoName: tempName.charAt(0).toUpperCase() + tempName.slice(1),
          casinoLogo: "",
          bannerImage: bannerUrl,
          shortDescription: "A new draft affiliate listing.",
          landingContent: `# ${tempName}\nWelcome introduction goes here...`,
          manualReview: "",
          welcomeBonus: "Exclusive Deposit Bonus",
          category: "Casino",
          country: "US, CA, GB",
          seoTitle: `${tempName} Review & Signup`,
          metaDescription: `Read our comprehensive guide to ${tempName} and claim custom deals.`,
          keywords: [tempName, "casino", "affiliate"],
          status: "draft",
          aiGenerated: false,
          featured: false,
          averageRating: 0,
          totalReviews: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "casinos"), newDraft);
        const createdCasino = { id: docRef.id, ...newDraft } as Casino;

        setEditingCasino(createdCasino);
        setEditFields(createdCasino);
        setEditKeywordsInput(createdCasino.keywords?.join(", ") || "");
        setIsAdding(false);
        setNewAffiliateLink("");
        setNewBannerFile(null);
        setNewBannerPreview("");
        setFormSuccess("Custom draft listing created! Complete details below.");
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to initiate listing.");
    } finally {
      setFormLoading(false);
      setNewBannerUploading(false);
    }
  };

  // Trigger AI content regeneration on an existing listing
  const handleRegenerateAi = async (casino: Casino) => {
    if (!window.confirm(`Are you sure you want to regenerate all AI content for "${casino.casinoName}"? This will overwrite the landing page draft content (your manual reviews will be preserved!).`)) {
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(`Regenerating AI content for ${casino.casinoName}...`);

    try {
      const response = await generateCasinoContent(casino.affiliateLink, casino.bannerImage, casino.id);
      if (response.success) {
        setFormSuccess(`Successfully regenerated AI content for ${casino.casinoName}!`);
        // If editing this casino, update states
        if (editingCasino?.id === casino.id) {
          const updated: Casino = {
            ...editingCasino,
            ...response.generatedData,
            landingContent: response.generatedData.landingContent || editingCasino.landingContent,
            slug: response.slug,
          };
          setEditingCasino(updated);
          setEditFields(updated);
        }
      } else {
        throw new Error("AI Content generator returned an unsuccessful state.");
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Regeneration failed.");
    } finally {
      setFormLoading(false);
    }
  };

  // Edit fields change handler
  const handleEditFieldChange = (key: keyof Casino, value: any) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  // Submit Listing modifications
  const handleUpdateCasino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCasino) return;

    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    const slug = (editFields.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug) {
      setFormError("SEO URL Slug is required.");
      setFormLoading(false);
      return;
    }

    // Ensure slug is unique (exclude self)
    const duplicateSlug = casinos.some((c) => c.slug === slug && c.id !== editingCasino.id);
    if (duplicateSlug) {
      setFormError("This slug is already occupied by another casino. Please make it unique.");
      setFormLoading(false);
      return;
    }

    if (!(editFields.casinoName || "").trim()) {
      setFormError("Casino brand name is required.");
      setFormLoading(false);
      return;
    }

    const finalKeywords = editKeywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const docRef = doc(db, "casinos", editingCasino.id);
      const updatedPayload = {
        ...editFields,
        slug,
        keywords: finalKeywords,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, updatedPayload);
      setFormSuccess(`Successfully updated casino listing for "${editFields.casinoName}"!`);
      setEditingCasino(null);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to update listing.");
    } finally {
      setFormLoading(false);
    }
  };

  // Fast inline actions (Publish / Archive / Featured)
  const handleUpdateStatus = async (id: string, newStatus: Casino["status"]) => {
    try {
      const docRef = doc(db, "casinos", id);
      await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      const docRef = doc(db, "casinos", id);
      await updateDoc(docRef, { featured: !current, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error("Featured toggle error:", err);
    }
  };

  // Soft Delete Listing (Always soft-delete, never purge!)
  const handleSoftDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the casino "${name}"? This action soft-deletes and removes it from listing tables, but does not purge it from Firestore.`)) {
      return;
    }

    try {
      const docRef = doc(db, "casinos", id);
      await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
      setFormSuccess(`Successfully archived & deleted "${name}".`);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (err: any) {
      console.error("Soft delete error:", err);
      alert(`Soft delete failed: ${err.message || err}`);
    }
  };

  // Bulk Operations
  const handleBulkAction = async (action: "publish" | "archive" | "delete" | "feature" | "unfeature") => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Apply bulk action "${action}" to ${selectedIds.length} selected listings?`)) {
      return;
    }

    setFormLoading(true);
    let successCount = 0;

    try {
      for (const id of selectedIds) {
        const docRef = doc(db, "casinos", id);
        let payload: any = { updatedAt: serverTimestamp() };

        if (action === "publish") payload.status = "published";
        else if (action === "archive") payload.status = "archived";
        else if (action === "delete") payload.isDeleted = true;
        else if (action === "feature") payload.featured = true;
        else if (action === "unfeature") payload.featured = false;

        await updateDoc(docRef, payload);
        successCount++;
      }

      setFormSuccess(`Successfully applied bulk action to ${successCount} listings.`);
      setSelectedIds([]);
      setBulkMenuOpen(false);
    } catch (err: any) {
      console.error("Bulk action failed:", err);
      setFormError(`Bulk action experienced failures: ${err.message || err}`);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Statistics Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Total */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Listings</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800">{statTotal}</span>
            <span className="text-[10px] text-slate-400">items</span>
          </div>
        </div>

        {/* Published */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Published</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{statPublished}</span>
            <span className="text-[10px] text-emerald-500 font-semibold">
              {statTotal > 0 ? `${Math.round((statPublished / statTotal) * 100)}%` : "0%"}
            </span>
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Drafts</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">{statDraft}</span>
            <span className="text-[10px] text-amber-500">pending</span>
          </div>
        </div>

        {/* AI Generated */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">AI Generated</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-700">{statAiGenerated}</span>
            <span className="text-[10px] text-indigo-500 font-semibold">Gemini</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 tracking-wider uppercase">Pending Review</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">{statPendingReview}</span>
            <span className="text-[10px] text-rose-400">review</span>
          </div>
        </div>

        {/* Sell Requests */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-cyan-600 tracking-wider uppercase">Sell Requests</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-cyan-700">{sellRequestsCount}</span>
            <span className="text-[10px] text-cyan-500 font-semibold">Offers</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Total Users</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-700">{totalUsersCount}</span>
            <span className="text-[10px] text-slate-400">Profiles</span>
          </div>
        </div>
      </div>

      {/* Toast Alert Box */}
      {(formSuccess || formError || formLoading) && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xs transition-all duration-300 ${
            formError
              ? "bg-red-50 border-red-150 text-red-800"
              : formLoading
              ? "bg-indigo-50 border-indigo-150 text-indigo-800"
              : "bg-emerald-50 border-emerald-150 text-emerald-800"
          }`}
        >
          {formLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
          ) : formError ? (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <div className="text-xs font-semibold flex-1">
            {formLoading ? "Processing transaction... Please hold." : formSuccess || formError}
          </div>
          <button
            onClick={() => {
              setFormSuccess(null);
              setFormError(null);
            }}
            className="p-1 rounded-full hover:bg-slate-200/50 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Workspace Switch */}
      {isAdding ? (
        /* Create New Listing Pane (Url and optional banner only) */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-900 tracking-tight">
                Add Casino Listing
              </h3>
              <p className="text-xs text-slate-500">
                Provide affiliate parameters. Other pages are constructed dynamically.
              </p>
            </div>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewAffiliateLink("");
                setNewBannerFile(null);
                setNewBannerPreview("");
              }}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateCasino} className="space-y-5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Affiliate Target Link *
              </label>
              <input
                type="text"
                value={newAffiliateLink}
                onChange={(e) => setNewAffiliateLink(e.target.value)}
                placeholder="https://tracker.casinopartner.com/visit/stake"
                required
                disabled={formLoading}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Banner Promo Image (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50 transition">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Click to Upload Banner</span>
                    <span className="text-[8px] text-slate-400">JPG/PNG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "newBanner")}
                      className="hidden"
                    />
                  </label>
                </div>

                {newBannerPreview && (
                  <div className="relative w-full sm:w-40 h-28 rounded-xl border border-slate-200 overflow-hidden shrink-0">
                    <img src={newBannerPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerFile(null);
                        setNewBannerPreview("");
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 rounded-full text-white hover:bg-slate-900 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Crawler Switch */}
            <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-bold text-indigo-950">AI Content Crawler Generation</span>
                  <input
                    type="checkbox"
                    checked={triggerAiOnCreate}
                    onChange={(e) => setTriggerAiOnCreate(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300"
                  />
                </label>
                <p className="text-[10px] text-indigo-700/85 mt-1 leading-normal">
                  Crawls the landing page, fetches canonical metadata, and instructs Gemini 2.5 Flash to automatically compile descriptions, Pros/Cons, welcome offers, and FAQs into a fresh draft.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Create Casino"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : editingCasino ? (
        /* 3. Comprehensive Edit Panel */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border">
                  Editing: {editingCasino.casinoName}
                </span>
                {editingCasino.aiGenerated && (
                  <span className="text-xs font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" /> AI Draft
                  </span>
                )}
              </div>
              <h3 className="font-display font-black text-xl text-slate-900 tracking-tight mt-1">
                Customize Listing Assets
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRegenerateAi(editingCasino)}
                className="px-3.5 py-2 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Overwrite Regenerate AI
              </button>

              <button
                onClick={() => setEditingCasino(null)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                title="Close editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Editor Sub Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto mb-6 scrollbar-none gap-2">
            {(["general", "images", "content", "seo", "preview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setEditTab(tab)}
                className={`px-4 py-2.5 font-bold text-xs capitalize border-b-2 transition whitespace-nowrap cursor-pointer ${
                  editTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleUpdateCasino} className="space-y-6">
            {editTab === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Casino Brand Name *
                  </label>
                  <input
                    type="text"
                    value={editFields.casinoName || ""}
                    onChange={(e) => handleEditFieldChange("casinoName", e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    SEO Friendly URL Slug *
                  </label>
                  <input
                    type="text"
                    value={editFields.slug || ""}
                    onChange={(e) => handleEditFieldChange("slug", e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Affiliate Target Link
                  </label>
                  <input
                    type="text"
                    value={editFields.affiliateLink || ""}
                    onChange={(e) => handleEditFieldChange("affiliateLink", e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20 text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Listing Category
                  </label>
                  <select
                    value={editFields.category || "Casino"}
                    onChange={(e) => handleEditFieldChange("category", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Casino">Casino</option>
                    <option value="Poker">Poker</option>
                    <option value="Sportsbook">Sportsbook</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Bonus">Bonus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Allowed / Supported Countries
                  </label>
                  <input
                    type="text"
                    value={editFields.country || ""}
                    onChange={(e) => handleEditFieldChange("country", e.target.value)}
                    placeholder="e.g. US, CA, GB, DE"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Listing Status
                  </label>
                  <select
                    value={editFields.status || "draft"}
                    onChange={(e) => handleEditFieldChange("status", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="ai_generated">AI Generated</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 border border-slate-100 p-3 rounded-xl bg-slate-50/40">
                  <input
                    type="checkbox"
                    id="featured-toggle"
                    checked={!!editFields.featured}
                    onChange={(e) => handleEditFieldChange("featured", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="featured-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Mark as Featured Spotlight Casino
                  </label>
                </div>
              </div>
            )}

            {editTab === "images" && (
              <div className="space-y-5">
                {/* Logo Section */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/30">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">Brand Logo Asset</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl border bg-white overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                      {editFields.casinoLogo ? (
                        <img
                          src={editFields.casinoLogo}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">No Logo</span>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5">
                          {uploadingLogo ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5" />
                          )}
                          <span>Replace & Optimize Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, "logo")}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                        </label>
                        <span className="text-[9px] text-slate-400">Resolves down to max 400x400 JPEG</span>
                      </div>
                      <input
                        type="text"
                        value={editFields.casinoLogo || ""}
                        onChange={(e) => handleEditFieldChange("casinoLogo", e.target.value)}
                        placeholder="Or insert custom logo URL..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner Section */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/30">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">Lander Header Banner Asset</h4>
                  <div className="space-y-4">
                    {editFields.bannerImage && (
                      <div className="w-full h-40 rounded-xl border overflow-hidden">
                        <img
                          src={editFields.bannerImage}
                          alt="Banner"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5">
                        {uploadingBanner ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        <span>Replace & Optimize Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "banner")}
                          className="hidden"
                          disabled={uploadingBanner}
                        />
                      </label>
                      <span className="text-[9px] text-slate-400">Resolves down to max 1600x900 JPEG</span>
                    </div>

                    <input
                      type="text"
                      value={editFields.bannerImage || ""}
                      onChange={(e) => handleEditFieldChange("bannerImage", e.target.value)}
                      placeholder="Or insert custom banner image URL..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {editTab === "content" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Short Catchy Tagline Description
                  </label>
                  <input
                    type="text"
                    value={editFields.shortDescription || ""}
                    onChange={(e) => handleEditFieldChange("shortDescription", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Welcome Offer / Sign-up Incentive
                  </label>
                  <input
                    type="text"
                    value={editFields.welcomeBonus || ""}
                    onChange={(e) => handleEditFieldChange("welcomeBonus", e.target.value)}
                    placeholder="e.g. 100% Bonus up to $1000 + 100 Free Spins"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    AI Landing Content (Markdown)
                  </label>
                  <textarea
                    rows={8}
                    value={editFields.landingContent || ""}
                    onChange={(e) => handleEditFieldChange("landingContent", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium font-mono focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                {/* Manual Review Field - Rich styled text area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Manual Editor Review & Verdict (Never overwritten by AI)
                    </label>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      Standard Editor Verified
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={editFields.manualReview || ""}
                    onChange={(e) => handleEditFieldChange("manualReview", e.target.value)}
                    placeholder="Add manual feedback, score breakdowns, terms & wagering evaluation, and personal rating details here..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>
              </div>
            )}

            {editTab === "seo" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Optimized SEO Title
                  </label>
                  <input
                    type="text"
                    value={editFields.seoTitle || ""}
                    onChange={(e) => handleEditFieldChange("seoTitle", e.target.value)}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Recommended length under 60 characters.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    SEO Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={editFields.metaDescription || ""}
                    onChange={(e) => handleEditFieldChange("metaDescription", e.target.value)}
                    maxLength={300}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20 resize-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Recommended length under 160 characters.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    SEO Keywords (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={editKeywordsInput}
                    onChange={(e) => setEditKeywordsInput(e.target.value)}
                    placeholder="e.g. crypto casino, sports, free spins"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>
              </div>
            )}

            {editTab === "preview" && (
              /* Public page preview simulator */
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-xs bg-slate-950 text-slate-100 font-sans">
                {/* Simulated Header Banner */}
                <div className="relative h-60 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {editFields.bannerImage ? (
                    <img
                      src={editFields.bannerImage}
                      alt="Banner Preview"
                      className="absolute inset-0 w-full h-full object-cover opacity-45"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 to-indigo-950 opacity-80" />
                  )}

                  <div className="relative z-10 text-center px-4 space-y-3">
                    {editFields.casinoLogo && (
                      <div className="w-16 h-16 rounded-2xl bg-white/95 p-1 mx-auto flex items-center justify-center shadow-lg border border-white/20">
                        <img
                          src={editFields.casinoLogo}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h1 className="text-2xl font-black tracking-tight">{editFields.casinoName || "Brand Name"}</h1>
                    <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest bg-indigo-950/60 inline-block px-3 py-1 rounded-full border border-indigo-500/30">
                      🎁 {editFields.welcomeBonus || "No offer available yet"}
                    </p>
                  </div>
                </div>

                {/* Simulated body */}
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-7xl mx-auto">
                  {/* Lander Content (Col 2/3) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed">
                      <h3 className="text-sm font-bold border-b border-slate-800 pb-2 mb-4 text-white">
                        Dynamic Landing Review Content
                      </h3>
                      <div className="markdown-body">
                        <ReactMarkdown>{editFields.landingContent || "No landing review generated."}</ReactMarkdown>
                      </div>
                    </div>

                    {editFields.manualReview && (
                      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-6 shadow-md prose prose-indigo max-w-none text-xs text-indigo-200 leading-relaxed">
                        <h3 className="text-sm font-bold border-b border-indigo-900/50 pb-2 mb-4 text-indigo-100 flex items-center gap-1.5">
                          <Bookmark className="w-4 h-4" /> Professional Verdict & Manual Commentary
                        </h3>
                        <div className="whitespace-pre-line">{editFields.manualReview}</div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar (Col 1/3) */}
                  <div className="lg:col-span-1 space-y-5">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Affiliate Landing link
                      </p>
                      <a
                        href={editFields.affiliateLink || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 transition-all font-bold text-xs rounded-xl flex items-center justify-center gap-2 text-white shadow-sm"
                      >
                        Visit Official Casino <ArrowUpRight className="w-4 h-4" />
                      </a>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Clicking the button redirects to the verified affiliate link using modern tracking.
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                      <h4 className="text-xs font-bold text-white border-b border-slate-800 pb-2">Specs</h4>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Category:</span>
                        <span className="font-semibold text-slate-200">{editFields.category || "Casino"}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Countries:</span>
                        <span className="font-semibold text-slate-200">{editFields.country || "General"}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>SEO Slug:</span>
                        <span className="font-mono text-indigo-400">/casino/{editFields.slug || "unknown"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editTab !== "preview" && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCasino(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Asset Changes
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        /* 4. Listing Table Workspace */
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {/* Workspace Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/40">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative min-w-[260px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search casinos, slugs, countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-[11px] font-bold text-slate-600 outline-none bg-transparent"
                >
                  <option value="all">Status: All</option>
                  <option value="draft">Drafts</option>
                  <option value="ai_generated">AI Generated</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-[11px] font-bold text-slate-600 outline-none bg-transparent capitalize"
                >
                  <option value="all">Category: All</option>
                  {categories.filter((c) => c !== "all").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="text-[11px] font-bold text-slate-600 outline-none bg-transparent"
                >
                  <option value="all">Country: All</option>
                  {countries.filter((c) => c !== "all").map((ctr) => (
                    <option key={ctr} value={ctr}>
                      {ctr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Featured Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Star className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={featuredFilter}
                  onChange={(e) => setFeaturedFilter(e.target.value)}
                  className="text-[11px] font-bold text-slate-600 outline-none bg-transparent"
                >
                  <option value="all">Featured: All</option>
                  <option value="featured">Featured Spotlight</option>
                  <option value="standard">Standard Listings</option>
                </select>
              </div>
            </div>

            {/* Actions: Add New Casino Button */}
            <div className="flex items-center gap-2">
              {/* Bulk actions dropdown */}
              {selectedIds.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
                    className="px-3 py-2 border border-slate-250 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    Bulk Actions ({selectedIds.length}) <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {bulkMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 text-xs text-slate-600 font-semibold">
                      <button
                        onClick={() => handleBulkAction("publish")}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-700"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Publish Selected
                      </button>
                      <button
                        onClick={() => handleBulkAction("archive")}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-amber-700"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive Selected
                      </button>
                      <button
                        onClick={() => handleBulkAction("feature")}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-indigo-700"
                      >
                        <Star className="w-3.5 h-3.5 fill-indigo-50" /> Feature Selected
                      </button>
                      <button
                        onClick={() => handleBulkAction("unfeature")}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-500"
                      >
                        <Star className="w-3.5 h-3.5" /> Unfeature Selected
                      </button>
                      <hr className="my-1 border-slate-100" />
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Soft Delete Selected
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsAdding(true)}
                className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Listing
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-500 tracking-wider">
                  <th className="px-6 py-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredCasinos.length > 0 && selectedIds.length === filteredCasinos.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-4">Brand Logo</th>
                  <th className="px-6 py-4">Casino Name & Category</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Featured</th>
                  <th className="px-6 py-4 text-center">Avg Rating</th>
                  <th className="px-6 py-4">Updated Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                {filteredCasinos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-slate-400 font-medium">
                      No matching casino listings found in this directory.
                    </td>
                  </tr>
                ) : (
                  filteredCasinos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/30 transition duration-150">
                      {/* Checkbox select */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => handleToggleSelect(c.id)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                      </td>

                      {/* Brand Logo */}
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-xl border bg-white overflow-hidden flex items-center justify-center p-1.5 shadow-sm">
                          {c.casinoLogo ? (
                            <img
                              src={c.casinoLogo}
                              alt={c.casinoName}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs uppercase rounded-lg">
                              {c.casinoName ? c.casinoName.substring(0, 2) : "C"}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Casino Name and Info */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-slate-900 font-black text-xs flex items-center gap-1.5">
                            {c.casinoName}
                            {c.aiGenerated && (
                              <span
                                className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-100 flex items-center"
                                title="AI Generated Content"
                              >
                                AI
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[180px] truncate">
                            /casino/{c.slug}
                          </p>
                          <span className="inline-block mt-1 text-[9px] font-bold uppercase bg-slate-150/60 text-slate-500 px-2 py-0.5 rounded">
                            {c.category || "Casino"}
                          </span>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize
                            ${
                              c.status === "published"
                                ? "bg-emerald-50 border-emerald-150 text-emerald-700"
                                : c.status === "draft"
                                ? "bg-slate-100 border-slate-200 text-slate-500"
                                : c.status === "ai_generated"
                                ? "bg-indigo-50 border-indigo-150 text-indigo-700 animate-pulse"
                                : c.status === "pending_review"
                                ? "bg-rose-50 border-rose-150 text-rose-700"
                                : "bg-amber-50 border-amber-150 text-amber-700"
                            }`}
                        >
                          {c.status === "ai_generated" ? "AI Generated" : c.status}
                        </span>
                      </td>

                      {/* Featured toggle action */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(c.id, c.featured)}
                          className={`p-1.5 rounded-full border transition cursor-pointer ${
                            c.featured
                              ? "text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                              : "text-slate-300 border-slate-200 hover:text-slate-500 hover:bg-slate-50"
                          }`}
                          title={c.featured ? "Unfeature listing" : "Spotlight feature listing"}
                        >
                          <Star className={`w-4 h-4 ${c.featured ? "fill-indigo-600" : ""}`} />
                        </button>
                      </td>

                      {/* Rating details */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 font-bold text-slate-700">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{c.averageRating?.toFixed(1) || "0.0"}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({c.totalReviews || 0})</span>
                        </div>
                      </td>

                      {/* Date details */}
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {c.updatedAt?.seconds
                          ? new Date(c.updatedAt.seconds * 1000).toLocaleDateString()
                          : c.updatedAt
                          ? new Date(c.updatedAt).toLocaleDateString()
                          : "Unknown"}
                      </td>

                      {/* Inline Action Row */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Publish/Archive quick toggles */}
                          {c.status !== "published" ? (
                            <button
                              onClick={() => handleUpdateStatus(c.id, "published")}
                              className="p-1.5 rounded-lg border border-slate-250 text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Quick Publish Listing"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(c.id, "archived")}
                              className="p-1.5 rounded-lg border border-slate-250 text-slate-400 hover:bg-slate-50 transition cursor-pointer"
                              title="Archive Listing"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Preview mode toggle */}
                          <button
                            onClick={() => {
                              setPreviewCasino(c);
                            }}
                            className="p-1.5 rounded-lg border border-slate-250 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                            title="Lander Page Preview Simulator"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Full editing */}
                          <button
                            onClick={() => {
                              setEditingCasino(c);
                              setEditFields(c);
                              setEditKeywordsInput(c.keywords?.join(", ") || "");
                              setEditTab("general");
                            }}
                            className="p-1.5 rounded-lg border border-slate-250 text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Assets"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* AI content regenerate trigger */}
                          <button
                            onClick={() => handleRegenerateAi(c)}
                            className="p-1.5 rounded-lg border border-slate-250 text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Regenerate dynamic assets with Gemini"
                          >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                          </button>

                          {/* Soft delete */}
                          <button
                            onClick={() => handleSoftDelete(c.id, c.casinoName)}
                            className="p-1.5 rounded-lg border border-slate-250 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Soft Delete Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Separate Public Page Preview Simulator Modal */}
      {previewCasino && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden max-w-5xl w-full text-slate-100 shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Page Simulator Mode
              </span>
              <button
                onClick={() => setPreviewCasino(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* simulated lander layout */}
            <div className="max-h-[80vh] overflow-y-auto">
              <div className="relative h-56 bg-slate-900 overflow-hidden flex items-center justify-center">
                {previewCasino.bannerImage ? (
                  <img
                    src={previewCasino.bannerImage}
                    alt="Banner Preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 to-indigo-950 opacity-80" />
                )}

                <div className="relative z-10 text-center px-4 space-y-3">
                  {previewCasino.casinoLogo && (
                    <div className="w-16 h-16 rounded-2xl bg-white p-1 mx-auto flex items-center justify-center shadow-lg">
                      <img
                        src={previewCasino.casinoLogo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <h1 className="text-2xl font-black tracking-tight">{previewCasino.casinoName}</h1>
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest bg-indigo-950/60 inline-block px-3.5 py-1 rounded-full border border-indigo-500/30">
                    🎁 {previewCasino.welcomeBonus || "Deposit Bonus Available"}
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                  {/* Dynamic lander page body */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed">
                    <h3 className="text-sm font-bold border-b border-slate-800 pb-2 mb-4 text-white">
                      Dynamic Landing Review Content
                    </h3>
                    <div className="markdown-body">
                      <ReactMarkdown>{previewCasino.landingContent || "No review content available."}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Manual Review Verdict Block */}
                  {previewCasino.manualReview && (
                    <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-6 shadow-md prose prose-indigo max-w-none text-xs text-indigo-200 leading-relaxed">
                      <h3 className="text-sm font-bold border-b border-indigo-900/50 pb-2 mb-4 text-indigo-100 flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4" /> Professional Verdict & Manual Commentary
                      </h3>
                      <div className="whitespace-pre-line">{previewCasino.manualReview}</div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1 space-y-5">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Affiliate Target link
                    </p>
                    <a
                      href={previewCasino.affiliateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 transition-all font-bold text-xs rounded-xl flex items-center justify-center gap-2 text-white shadow-sm"
                    >
                      Visit Official Casino <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                    <h4 className="text-xs font-bold text-white border-b border-slate-800 pb-2">Specs</h4>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Category:</span>
                      <span className="font-semibold text-slate-200">{previewCasino.category || "Casino"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Countries:</span>
                      <span className="font-semibold text-slate-200">{previewCasino.country || "General"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>SEO Slug:</span>
                      <span className="font-mono text-indigo-400">/casino/{previewCasino.slug}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setPreviewCasino(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl transition cursor-pointer text-white"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasinoManager;
