import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  getDocs,
} from "firebase/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import {
  Search,
  Filter,
  Image as ImageIcon,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  UploadCloud,
  Loader2,
  Calendar,
  User,
  Copy,
  ExternalLink,
  RefreshCw,
  FileText,
  Check,
  Layers,
  Info,
  ChevronRight,
} from "lucide-react";

interface MediaAsset {
  id: string;
  url: string;
  name: string;
  alt: string;
  folderType: string;
  uploadedAt: string;
  uploadedByEmail: string;
  uploadedByUid: string;
  fileSize?: number;
  isDiscovered?: boolean; // True if harvested from other collections but not yet in mediaAssets
}

interface ImageUsage {
  id: string;
  type: "casino-logo" | "casino-banner" | "promo-banner" | "review-screenshot" | "jackpot" | "sell-request";
  title: string;
  refId: string;
}

interface ContentManagerProps {
  isAdminOrMod?: boolean;
}

export const ContentManager: React.FC<ContentManagerProps> = ({ isAdminOrMod = false }) => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload Form
  const [uploadFolder, setUploadFolder] = useState<string>("banners");
  const [customName, setCustomName] = useState<string>("");
  const [customAlt, setCustomAlt] = useState<string>("");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [usageFilter, setUsageFilter] = useState<string>("all"); // all, used, unused
  const [sortBy, setSortBy] = useState<string>("newest"); // newest, oldest, size

  // Selected Image for Detail View
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editAlt, setEditAlt] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Deletion modals
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [isExecutingDelete, setIsExecutingDelete] = useState<boolean>(false);

  // Real-time parsed usage map (url -> ImageUsage[])
  const [usageMap, setUsageMap] = useState<Record<string, ImageUsage[]>>({});
  const [isScanningUsage, setIsScanningUsage] = useState<boolean>(false);

  // Scan all other collections to build a usage tree
  const scanDatabaseUsage = async () => {
    if (!isAdminOrMod) return;
    setIsScanningUsage(true);
    const newUsageMap: Record<string, ImageUsage[]> = {};

    const addUsage = (url: string, usage: ImageUsage) => {
      if (!url || typeof url !== "string" || !url.startsWith("http")) return;
      // Normalize URL (strip f_auto, q_auto parameters if present to match keys correctly)
      const normalized = url.replace("/f_auto,q_auto", "");
      if (!newUsageMap[normalized]) {
        newUsageMap[normalized] = [];
      }
      // Check if duplicate is already added
      const exists = newUsageMap[normalized].some(
        (u) => u.refId === usage.refId && u.type === usage.type
      );
      if (!exists) {
        newUsageMap[normalized].push(usage);
      }
    };

    try {
      // 1. Scan Casinos (logos & banners)
      const casinosSnap = await getDocs(collection(db, "casinos"));
      casinosSnap.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const name = data.casinoName || "Unnamed Casino";

        if (data.casinoLogo) {
          addUsage(data.casinoLogo, {
            id: `${id}-logo`,
            type: "casino-logo",
            title: `Casino Logo - ${name}`,
            refId: id,
          });
        }
        if (data.bannerImage) {
          addUsage(data.bannerImage, {
            id: `${id}-banner`,
            type: "casino-banner",
            title: `Casino Banner - ${name}`,
            refId: id,
          });
        }
      });

      // 2. Scan Banners
      const bannersSnap = await getDocs(collection(db, "banners"));
      bannersSnap.forEach((d) => {
        const data = d.data();
        const id = d.id;
        if (data.imageUrl) {
          addUsage(data.imageUrl, {
            id,
            type: "promo-banner",
            title: `Promo Banner - ${data.title || "Untitled"}`,
            refId: id,
          });
        }
      });

      // 3. Scan Reviews
      const reviewsSnap = await getDocs(collection(db, "reviews"));
      reviewsSnap.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const reviewTitle = data.title || "User Review";
        if (data.jackpotScreenshot) {
          addUsage(data.jackpotScreenshot, {
            id: `${id}-jackpot`,
            type: "review-screenshot",
            title: `Review Jackpot - ${reviewTitle}`,
            refId: id,
          });
        }
        if (data.balanceScreenshot) {
          addUsage(data.balanceScreenshot, {
            id: `${id}-balance`,
            type: "review-screenshot",
            title: `Review Balance - ${reviewTitle}`,
            refId: id,
          });
        }
      });

      // 4. Scan JackpotScreenshots
      const jackpotsSnap = await getDocs(collection(db, "jackpotScreenshots"));
      jackpotsSnap.forEach((d) => {
        const data = d.data();
        const id = d.id;
        if (data.image) {
          addUsage(data.image, {
            id,
            type: "jackpot",
            title: `Jackpot Proof - $${data.amount || "0"}`,
            refId: id,
          });
        }
      });

      // 5. Scan SellRequests
      const sellRequestsSnap = await getDocs(collection(db, "sellRequests"));
      sellRequestsSnap.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const name = data.casinoName || "Sell Request";
        if (data.screenshot) {
          addUsage(data.screenshot, {
            id: `${id}-sc`,
            type: "sell-request",
            title: `Sell Request Proof - ${name}`,
            refId: id,
          });
        }
        if (data.balanceScreenshot) {
          addUsage(data.balanceScreenshot, {
            id: `${id}-balance`,
            type: "sell-request",
            title: `Sell Request Balance - ${name}`,
            refId: id,
          });
        }
      });

      setUsageMap(newUsageMap);
    } catch (err) {
      console.error("Error scanning db usage:", err);
    } finally {
      setIsScanningUsage(false);
    }
  };

  // Sync mediaAssets and dynamically discover any other images
  useEffect(() => {
    // Run initial usage scan if authorized
    if (isAdminOrMod) {
      scanDatabaseUsage();
    }

    const unsubscribe = onSnapshot(
      collection(db, "mediaAssets"),
      async (snap) => {
        const registered = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MediaAsset[];

        // Dynamically discover images in database to ensure 100% visibility
        const discoveredMap: Record<string, MediaAsset> = {};

        // Helper to add discovered image
        const addDiscovered = (url: string, name: string, folderType: string) => {
          if (!url || typeof url !== "string" || !url.startsWith("http")) return;
          const normalized = url.replace("/f_auto,q_auto", "");
          
          // Check if already registered
          const isRegistered = registered.some(
            (r) => r.url.replace("/f_auto,q_auto", "") === normalized
          );
          if (!isRegistered && !discoveredMap[normalized]) {
            discoveredMap[normalized] = {
              id: `discovered-${Math.random().toString(36).substring(2, 9)}`,
              url,
              name,
              alt: name.split(".")[0] || "Discovered image",
              folderType,
              uploadedAt: new Date().toISOString(),
              uploadedByEmail: "Discovered in listings",
              uploadedByUid: "system",
              isDiscovered: true,
            };
          }
        };

        // Scan current active maps or database documents to harvesting images (Only if admin or moderator)
        if (isAdminOrMod) {
          try {
            const casinosSnap = await getDocs(collection(db, "casinos"));
            casinosSnap.forEach((d) => {
              const data = d.data();
              if (data.casinoLogo) addDiscovered(data.casinoLogo, `${data.casinoName || "casino"}_logo.png`, "logos");
              if (data.bannerImage) addDiscovered(data.bannerImage, `${data.casinoName || "casino"}_banner.png`, "banners");
            });

            const bannersSnap = await getDocs(collection(db, "banners"));
            bannersSnap.forEach((d) => {
              const data = d.data();
              if (data.imageUrl) addDiscovered(data.imageUrl, `${data.title || "banner"}_promo.png`, "banners");
            });

            const jackpotsSnap = await getDocs(collection(db, "jackpotScreenshots"));
            jackpotsSnap.forEach((d) => {
              const data = d.data();
              if (data.image) addDiscovered(data.image, `jackpot_proof_${d.id}.png`, "jackpots");
            });
          } catch (e) {
            console.warn("Error harvesting current listing images:", e);
          }
        }

        const discoveredList = Object.values(discoveredMap);
        const unified = [...registered, ...discoveredList];
        setAssets(unified);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching media assets:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdminOrMod]);

  // Helper: check if asset is in use
  const getAssetUsages = (asset: MediaAsset): ImageUsage[] => {
    const normUrl = asset.url.replace("/f_auto,q_auto", "");
    return usageMap[normUrl] || [];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const assetName = customName.trim() || file.name;

    try {
      // Direct signed upload
      const url = await uploadToCloudinary(file, uploadFolder as any, assetName);

      // Save custom fields if provided
      if (customAlt.trim()) {
        // Query to find the newly registered asset doc and update it with custom alt
        setTimeout(async () => {
          try {
            const assetsSnap = await getDocs(collection(db, "mediaAssets"));
            const match = assetsSnap.docs.find((d) => d.data().url === url);
            if (match) {
              await updateDoc(doc(db, "mediaAssets", match.id), {
                alt: customAlt.trim(),
                name: customName.trim() || match.data().name,
              });
            }
          } catch (e) {
            console.warn("Failed to set custom alt right away:", e);
          }
        }, 1500);
      }

      setSuccessMsg("Image uploaded and registered successfully in Content library!");
      setCustomName("");
      setCustomAlt("");
      // Recalculate database usages
      scanDatabaseUsage();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Upload failed: ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Show detailed attributes of selected asset
  const handleSelectAsset = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setIsEditing(false);
    setEditName(asset.name);
    setEditAlt(asset.alt);
    setCopiedUrl(false);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveEdits = async () => {
    if (!selectedAsset || selectedAsset.isDiscovered) return;
    setIsSavingEdit(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateDoc(doc(db, "mediaAssets", selectedAsset.id), {
        name: editName.trim() || selectedAsset.name,
        alt: editAlt.trim() || selectedAsset.alt,
      });
      setSelectedAsset((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim() || prev.name,
              alt: editAlt.trim() || prev.alt,
            }
          : null
      );
      setIsEditing(false);
      setSuccessMsg("Image attributes updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to save edits.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTrigger = (asset: MediaAsset) => {
    setAssetToDelete(asset);
  };

  const executeDeleteAsset = async () => {
    if (!assetToDelete) return;
    setIsExecutingDelete(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (assetToDelete.isDiscovered) {
        // Discovered assets are virtual and generated from database listings.
        // To delete them, user has to delete them from where they are used.
        setErrorMsg("This discovered image is stored in listing collections. To delete it, remove it from the corresponding Casino or review!");
        setAssetToDelete(null);
        return;
      }

      // Delete the registered Firestore asset
      await deleteDoc(doc(db, "mediaAssets", assetToDelete.id));

      setSuccessMsg(`Image "${assetToDelete.name}" removed from Content Manager directory.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setSelectedAsset(null);
      setAssetToDelete(null);
      // Recalculate usage map
      scanDatabaseUsage();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to delete asset: " + (err.message || err));
    } finally {
      setIsExecutingDelete(false);
    }
  };

  // Human file size converter
  const formatBytes = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Filter and Search Logic
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Search query match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.alt.toLowerCase().includes(q) ||
          a.url.toLowerCase().includes(q)
      );
    }

    // Folder type filter
    if (folderFilter !== "all") {
      result = result.filter((a) => a.folderType === folderFilter);
    }

    // Usage filter
    if (usageFilter === "used") {
      result = result.filter((a) => getAssetUsages(a).length > 0);
    } else if (usageFilter === "unused") {
      result = result.filter((a) => getAssetUsages(a).length === 0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      } else if (sortBy === "size") {
        return (b.fileSize || 0) - (a.fileSize || 0);
      }
      return 0;
    });

    return result;
  }, [assets, searchTerm, folderFilter, usageFilter, sortBy, usageMap]);

  return (
    <div className="space-y-6">
      {/* Upper Descriptive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Admin Content & Media Manager
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage, upload, and optimize images used across your affiliate landing pages. Monitor active image dependencies across all lists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scanDatabaseUsage}
            disabled={isScanningUsage}
            className="p-2 border border-slate-200 hover:border-slate-350 bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Scan database usages"
          >
            <RefreshCw className={`w-4 h-4 ${isScanningUsage ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Usage Maps</span>
          </button>
        </div>
      </div>

      {/* Messages banner */}
      {(successMsg || errorMsg) && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 ${
            errorMsg ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {errorMsg ? <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" /> : <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
          <span className="text-xs font-bold flex-1">{successMsg || errorMsg}</span>
          <button onClick={() => { setSuccessMsg(null); setErrorMsg(null); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main split dashboard: left side filters/grid, right side detailed preview card */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {/* Upload Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              Upload New Media Asset
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Folder Destination
                </label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 bg-slate-50/50"
                >
                  <option value="banners">Banners & Promos</option>
                  <option value="logos">Casino Logos</option>
                  <option value="jackpots">Jackpot Screenshots</option>
                  <option value="avatars">User Avatars</option>
                  <option value="user-submissions">User Submissions</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Asset Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stake Logo Red"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Alt Text Attribute (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official Stake Casino Logo SVG"
                  value={customAlt}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50/30 rounded-2xl cursor-pointer transition">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-[11px] font-bold text-slate-500">Uploading and indexing image to Cloudinary...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <UploadCloud className="w-7 h-7 text-slate-400" />
                    <span className="text-xs font-extrabold text-slate-700">Choose file or drag & drop</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, WEBP, or SVG (Max 5MB)</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
          </div>

          {/* Catalog Filters and Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Media Library Directory ({filteredAssets.length})
              </h4>

              <div className="flex items-center gap-2 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 md:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-450" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, url..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Inline Filter Selectors */}
            <div className="flex flex-wrap gap-2 items-center text-xs text-slate-600">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold">Filters:</span>
              </div>

              {/* Folder Selector */}
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl font-semibold focus:outline-hidden"
              >
                <option value="all">All Folders / Types</option>
                <option value="banners">Banners & Promos</option>
                <option value="logos">Casino Logos</option>
                <option value="jackpots">Jackpot Screenshots</option>
                <option value="user-submissions">User Submissions</option>
                <option value="avatars">Avatars</option>
              </select>

              {/* Usage Selector */}
              <select
                value={usageFilter}
                onChange={(e) => setUsageFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl font-semibold focus:outline-hidden"
              >
                <option value="all">All Usages</option>
                <option value="used">In-Use / Referenced</option>
                <option value="unused">Unused Images Only</option>
              </select>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl font-semibold focus:outline-hidden ml-auto"
              >
                <option value="newest">Newest Uploads</option>
                <option value="oldest">Oldest Uploads</option>
                <option value="size">Largest File Size</option>
              </select>
            </div>

            {/* Grid display */}
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-150 rounded-2xl bg-slate-50/20">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No media assets match current query</p>
                <p className="text-[10px] text-slate-400 mt-1">Try resetting search filters or upload your first image asset above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                {filteredAssets.map((asset) => {
                  const usages = getAssetUsages(asset);
                  const isReferenced = usages.length > 0;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      className={`group border rounded-xl overflow-hidden cursor-pointer transition-all bg-slate-50/20 shadow-2xs hover:shadow-md flex flex-col justify-between ${
                        selectedAsset?.url === asset.url
                          ? "border-indigo-600 ring-2 ring-indigo-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Image Thumbnail Preview container */}
                      <div className="h-28 w-full bg-slate-950 overflow-hidden relative flex items-center justify-center">
                        <img
                          src={asset.url}
                          alt={asset.alt}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain object-center transition-transform group-hover:scale-103 duration-300"
                        />
                        <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
                          {isReferenced ? (
                            <span className="bg-emerald-500/90 text-white font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-emerald-400 shadow-sm flex items-center gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="bg-slate-700/85 text-slate-200 font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-slate-600 shadow-sm">
                              Unused
                            </span>
                          )}
                        </div>

                        {asset.isDiscovered && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="bg-indigo-650 text-white font-bold text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-xs">
                              Listing Doc
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info label block */}
                      <div className="p-2.5 border-t border-slate-100 bg-white">
                        <h5 className="text-[11px] font-black text-slate-800 line-clamp-1 leading-tight mb-0.5">
                          {asset.name}
                        </h5>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                          {asset.folderType}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Attribute Preview Sidebar (Right column) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Asset Attributes Preview
            </h4>
            {selectedAsset && (
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedAsset ? (
            <div className="space-y-4">
              {/* Full-width Image Area */}
              <div className="border border-slate-150 rounded-xl overflow-hidden relative bg-slate-950 p-2 min-h-40 max-h-56 flex items-center justify-center">
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.alt}
                  className="max-h-52 max-w-full object-contain"
                />
                <a
                  href={selectedAsset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-950 text-white rounded-lg transition"
                  title="Open full image"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Copy URL widget */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-2 rounded-xl">
                <span className="text-[9px] font-mono text-slate-500 flex-1 truncate select-all">
                  {selectedAsset.url}
                </span>
                <button
                  onClick={() => handleCopyUrl(selectedAsset.url)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-550 transition flex items-center justify-center cursor-pointer"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Edit form */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-550 uppercase tracking-wider mb-1">
                    Display Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-250 rounded-xl text-xs font-semibold focus:border-indigo-500 bg-slate-50/50"
                    />
                  ) : (
                    <p className="text-xs font-bold text-slate-800 break-all bg-slate-50/30 border border-transparent p-1.5 rounded-lg">
                      {selectedAsset.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-550 uppercase tracking-wider mb-1">
                    Alternative Text (alt)
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-250 rounded-xl text-xs font-semibold focus:border-indigo-500 bg-slate-50/50"
                    />
                  ) : (
                    <p className="text-xs font-medium text-slate-550 break-all bg-slate-50/30 border border-transparent p-1.5 rounded-lg">
                      {selectedAsset.alt || <span className="text-slate-400 italic">No alt text set</span>}
                    </p>
                  )}
                </div>

                {/* Edit operations */}
                {!selectedAsset.isDiscovered && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-1.5 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdits}
                          disabled={isSavingEdit}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Save</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Image Details</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Metadata */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">Folder Path:</span>
                  <span className="font-bold text-slate-700 uppercase tracking-wide">{selectedAsset.folderType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">File Size:</span>
                  <span className="font-bold text-slate-700">{formatBytes(selectedAsset.fileSize)}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-slate-400">Uploader:</span>
                  <span className="font-bold text-slate-700 break-all text-right">{selectedAsset.uploadedByEmail}</span>
                </div>
                {selectedAsset.uploadedAt && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400">Upload Date:</span>
                    <span className="font-bold text-slate-700">
                      {new Date(selectedAsset.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* ACTIVE DEPENDENCIES CHECK (Where is it used) */}
              <div className="pt-3.5 border-t border-slate-100 space-y-2.5 text-left">
                <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wider">
                  Active Page Usage ({getAssetUsages(selectedAsset).length})
                </span>

                {getAssetUsages(selectedAsset).length === 0 ? (
                  <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Unused Asset</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">This image is not currently referenced anywhere in listings, reviews, or promotional banners. It can be safely deleted!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                    {getAssetUsages(selectedAsset).map((use) => (
                      <div
                        key={use.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block line-clamp-1">{use.title}</span>
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{use.type}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-white px-1.5 py-0.5 border border-slate-100 rounded">
                          {use.refId.substring(0, 5)}...
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DELETE BUTTON */}
              <div className="pt-2">
                <button
                  onClick={() => handleDeleteTrigger(selectedAsset)}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Media Entry</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-450 space-y-2">
              <ImageIcon className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-xs font-bold">No Image Selected</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">
                Click on any image thumbnail in your directory to view full detailed metadata and usage maps.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* WARNING POPUP / CONFIRMATION MODAL FOR DELETION */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 transform transition-all animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-605 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="space-y-1.5 text-left">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Delete Media Asset?
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-extrabold text-slate-800">"{assetToDelete.name}"</span>?
                </p>
              </div>
            </div>

            {/* DYNAMIC DEPENDENCY WARNING PANEL */}
            {getAssetUsages(assetToDelete).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>CRITICAL WARNING: Image is In-Use!</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                  This image is currently active and referenced by <span className="font-bold text-slate-900">{getAssetUsages(assetToDelete).length} active pages/documents</span>. If you delete it, those pages will show broken image icons!
                </p>
                <div className="border-t border-amber-200/50 pt-2 space-y-1">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active usages list:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1 no-scrollbar">
                    {getAssetUsages(assetToDelete).map((use) => (
                      <div key={use.id} className="text-[10px] text-slate-700 flex justify-between font-bold">
                        <span>• {use.title}</span>
                        <span className="text-[8px] font-mono uppercase text-indigo-700 bg-white px-1 rounded">{use.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isExecutingDelete}
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingDelete}
                onClick={executeDeleteAsset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition duration-150 disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isExecutingDelete ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
