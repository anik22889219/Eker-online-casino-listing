import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
} from "lucide-react";
import { Casino, Bonus } from "../../types/firestore";

export const BonusManager: React.FC = () => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bonusType, setBonusType] = useState("Welcome Bonus");
  const [amount, setAmount] = useState<number>(100);
  const [expiryDate, setExpiryDate] = useState("");
  const [active, setActive] = useState(true);
  const [selectedCasinoIds, setSelectedCasinoIds] = useState<string[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Custom Delete confirmation modal states
  const [bonusToDelete, setBonusToDelete] = useState<Bonus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Sync active published casinos
    const unsubCasinos = onSnapshot(
      collection(db, "casinos"),
      (snap) => {
        const list: Casino[] = [];
        snap.forEach((d) => {
          const data = d.data() as Casino;
          if (!data.isDeleted) {
            list.push({ id: d.id, ...data });
          }
        });
        setCasinos(list);
      },
      (err) => console.error("Error loading casinos:", err)
    );

    // Sync all bonuses
    const unsubBonuses = onSnapshot(
      collection(db, "bonuses"),
      (snap) => {
        const list: Bonus[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Bonus);
        });
        setBonuses(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading bonuses:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubCasinos();
      unsubBonuses();
    };
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setBonusType("Welcome Bonus");
    setAmount(100);
    setExpiryDate("");
    setActive(true);
    setSelectedCasinoIds([]);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || selectedCasinoIds.length === 0) {
      setActionError("Please complete all required fields and select at least one casino.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (isEditing && editingId) {
        // Edit single bonus doc
        const docRef = doc(db, "bonuses", editingId);
        await updateDoc(docRef, {
          casinoId: selectedCasinoIds[0], // Edit updates the first/single bound casino
          title,
          description,
          bonusType,
          amount: Number(amount),
          expiryDate,
          active,
        });
        setActionSuccess("Promo Bonus updated successfully!");
        resetForm();
      } else {
        // Add bonus docs: Create a duplicate doc for each selected casino to match security model beautifully
        for (const casinoId of selectedCasinoIds) {
          await addDoc(collection(db, "bonuses"), {
            casinoId,
            title,
            description,
            bonusType,
            amount: Number(amount),
            expiryDate,
            active,
          });
        }
        setActionSuccess(`Successfully linked promo bonus to ${selectedCasinoIds.length} casino(s)!`);
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to save bonus. Please verify validation rules.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditInit = (bonus: Bonus) => {
    setIsEditing(true);
    setEditingId(bonus.id);
    setTitle(bonus.title);
    setDescription(bonus.description);
    setBonusType(bonus.bonusType);
    setAmount(bonus.amount);
    setExpiryDate(bonus.expiryDate || "");
    setActive(bonus.active);
    setSelectedCasinoIds([bonus.casinoId]);
  };

  const handleDelete = (bonus: Bonus) => {
    setBonusToDelete(bonus);
  };

  const executeDeleteBonus = async () => {
    if (!bonusToDelete) return;
    setIsDeleting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await deleteDoc(doc(db, "bonuses", bonusToDelete.id));
      setActionSuccess("Bonus promotion deleted successfully.");
      setBonusToDelete(null);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to delete bonus.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (bonus: Bonus) => {
    try {
      await updateDoc(doc(db, "bonuses", bonus.id), {
        active: !bonus.active,
      });
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const getCasinoName = (id: string) => {
    return casinos.find((c) => c.id === id)?.casinoName || "Unknown Casino";
  };

  // Filter & Search calculations
  const filteredBonuses = bonuses.filter((b) => {
    const matchedSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCasinoName(b.casinoId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchedType = typeFilter === "all" || b.bonusType === typeFilter;
    return matchedSearch && matchedType;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {(actionSuccess || actionError || actionLoading) && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
            actionError
              ? "bg-red-50 border-red-150 text-red-800"
              : actionLoading
              ? "bg-indigo-50 border-indigo-150 text-indigo-800"
              : "bg-emerald-50 border-emerald-150 text-emerald-800"
          }`}
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          ) : actionError ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          )}
          <span className="text-xs font-semibold flex-1">
            {actionLoading ? "Writing changes to Cloud Firestore..." : actionSuccess || actionError}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Creation/Edit Form Block */}
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h3 className="font-sans font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Percent className="h-4 w-4 text-indigo-600" />
            <span>{isEditing ? "Modify Campaign" : "Launch Bonus Promotion"}</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Bonus Campaign Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 200% Signup Bonus up to $500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Detailed terms / Promo description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe wagering requirements, spin values, minimum deposit thresholds, or coupon codes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/30 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Incentive Type
                </label>
                <select
                  value={bonusType}
                  onChange={(e) => setBonusType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 bg-slate-50/30 text-slate-700"
                >
                  <option value="Welcome Bonus">Welcome Bonus</option>
                  <option value="Free Spins">Free Spins</option>
                  <option value="Cashback Offers">Cashback Offers</option>
                  <option value="Promo Codes">Promo Codes</option>
                  <option value="Seasonal Promotions">Seasonal Promotions</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Numeric Value ($ / Spins)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/30 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Campaign Expiry
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-slate-50/30 text-slate-700 font-mono"
                />
              </div>

              <div className="flex items-center justify-between border border-slate-100 rounded-xl p-2 bg-slate-50/30">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Status
                </span>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className="text-indigo-600 hover:scale-105 transition"
                >
                  {active ? (
                    <ToggleRight className="h-8 w-8" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Link to Casinos */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {isEditing ? "Linked Casino (Single Edit Only)" : "Link to One or More Casinos *"}
              </label>
              {casinos.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No published casinos found in database.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/20 space-y-2">
                  {casinos.map((c) => {
                    const isChecked = selectedCasinoIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type={isEditing ? "radio" : "checkbox"}
                          name="casino-selector"
                          checked={isChecked}
                          onChange={() => {
                            if (isEditing) {
                              setSelectedCasinoIds([c.id]);
                            } else {
                              if (isChecked) {
                                setSelectedCasinoIds(selectedCasinoIds.filter((id) => id !== c.id));
                              } else {
                                setSelectedCasinoIds([...selectedCasinoIds, c.id]);
                              }
                            }
                          }}
                          className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="truncate">{c.casinoName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 border border-slate-250 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  "Apply Edits"
                ) : (
                  "Deploy Promo"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live List Display block */}
        <div className="xl:col-span-2 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Filter className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search bonuses by title, details or casino..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-600"
              >
                <option value="all">All Incentive Types</option>
                <option value="Welcome Bonus">Welcome Bonuses</option>
                <option value="Free Spins">Free Spins</option>
                <option value="Cashback Offers">Cashback Offers</option>
                <option value="Promo Codes">Promo Codes</option>
                <option value="Seasonal Promotions">Seasonal Promotions</option>
              </select>
            </div>
          </div>

          {/* List display */}
          {filteredBonuses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400">
              <Layers className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-display font-extrabold text-sm text-slate-700">No active promotions</h4>
              <p className="text-xs text-slate-500">Launch a campaign to bind active promo deals to affiliate listings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBonuses.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                        {b.bonusType}
                      </span>
                      <span className="text-xs font-black text-indigo-900 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 font-mono">
                        Value: {b.amount.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                        {b.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                        Linked Casino: <span className="text-indigo-600">{getCasinoName(b.casinoId)}</span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic line-clamp-3">
                      "{b.description}"
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-slate-350" />
                      Expires: {b.expiryDate || "Never"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(b)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                          b.active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        {b.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => handleEditInit(b)}
                        className="p-1.5 rounded-lg border border-slate-250 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        title="Edit Bonus"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-1.5 rounded-lg border border-slate-250 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Bonus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {bonusToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-100 transform transition-all animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-100 text-red-650 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="space-y-1.5 text-left">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Delete Promo Campaign?
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete the promotion <span className="font-bold text-slate-800">"{bonusToDelete.title}"</span>? This action is irreversible and will remove the offer from linked affiliate listings instantly.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBonusToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeDeleteBonus}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition duration-150 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-red-100 cursor-pointer"
              >
                {isDeleting ? (
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

export default BonusManager;
