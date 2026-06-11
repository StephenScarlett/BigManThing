import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Entity, GuessNahMode } from "@bmt/shared";
import CropModal from "./CropModal";

interface AttributeOption {
  id: string;
  attribute: string;
  value: string;
  display_label: string;
  parent_group: string | null;
  sort_order: number;
}

interface Props {
  entity: Entity | null; // null = creating
  defaultMode: GuessNahMode;
  onSave: () => void;
  onCancel: () => void;
}

export default function EntityForm({ entity, defaultMode, onSave, onCancel }: Props) {
  const isEdit = !!entity;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AttributeOption[]>([]);

  const loadOptions = useCallback(async () => {
    const { data } = await supabase
      .from("attribute_options")
      .select("*")
      .order("sort_order");
    setOptions(data ?? []);
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const optionsFor = useCallback(
    (attr: string) => options.filter((o) => o.attribute === attr),
    [options],
  );

  // Form state
  const [mode, setMode] = useState<GuessNahMode>(entity?.mode ?? defaultMode);
  const [name, setName] = useState(entity?.name ?? "");
  const [aliases, setAliases] = useState(entity?.aliases?.join(", ") ?? "");
  const [description, setDescription] = useState(entity?.description ?? "");
  const [difficulty, setDifficulty] = useState(entity?.difficulty ?? "medium");
  const [guessEnabled, setGuessEnabled] = useState(entity?.guess_nah_enabled ?? true);
  const [drawEnabled, setDrawEnabled] = useState(entity?.draw_nah_enabled ?? true);

  // Era as year range. era_end = null means "ongoing/current".
  const [eraStart, setEraStart] = useState<string>(entity?.era_start?.toString() ?? "");
  const [eraEnd, setEraEnd] = useState<string>(entity?.era_end?.toString() ?? "");
  const [eraOngoing, setEraOngoing] = useState<boolean>(
    entity ? entity.era_end == null && entity.era_start != null : false,
  );

  // Image
  const [imageUrl, setImageUrl] = useState(entity?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Multi-select arrays — all stored as string[]
  const [field, setField] = useState<string[]>(entity?.field ?? []);
  const [role, setRole] = useState<string[]>(entity?.role ?? []);
  const [affiliations, setAffiliations] = useState<string[]>(entity?.affiliations ?? []);
  const [gender, setGender] = useState<string[]>(entity?.gender ?? []);
  const [status, setStatus] = useState<string[]>(entity?.status ?? []);
  const [details, setDetails] = useState<string[]>(entity?.details ?? []);
  const [origin, setOrigin] = useState<string[]>(entity?.origin ?? []);

  // Ting
  const [kind, setKind] = useState<string[]>(entity?.kind ?? []);
  const [heritage, setHeritage] = useState<string[]>(entity?.heritage ?? []);
  const [material, setMaterial] = useState<string[]>(entity?.material ?? []);
  const [occasion, setOccasion] = useState<string[]>(entity?.occasion ?? []);
  const [sense, setSense] = useState<string[]>(entity?.sense ?? []);
  const [reach, setReach] = useState<string[]>(entity?.reach ?? []);

  // ── Image upload with interactive crop ────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null); // object URL waiting to be cropped

  function openCrop(file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  }

  async function handleCropConfirm(blob: Blob) {
    // Free the object URL now that we have the blob
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploading(true);
    setError(null);
    try {
      const path = `entities/${crypto.randomUUID()}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("entity-images")
        .upload(path, blob, { contentType: "image/webp", upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("entity-images")
        .getPublicUrl(path);
      setImageUrl(urlData.publicUrl);
    } catch (e) {
      setError(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    // Reset file input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) openCrop(file);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const aliasArray = aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const row: Record<string, unknown> = {
      mode,
      name: name.trim(),
      aliases: aliasArray,
      era_start: eraStart ? parseInt(eraStart) : null,
      era_end: eraOngoing ? null : eraEnd ? parseInt(eraEnd) : null,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      difficulty,
      guess_nah_enabled: guessEnabled,
      draw_nah_enabled: drawEnabled,
    };

    if (mode === "dem") {
      Object.assign(row, {
        field: field.length ? field : null,
        role: role.length ? role : null,
        affiliations: affiliations.length ? affiliations : null,
        gender: gender.length ? gender : null,
        status: status.length ? status : null,
        details: details.length ? details : null,
        origin: origin.length ? origin : null,
        reach: reach.length ? reach : null,
        // Clear ting fields
        kind: null, heritage: null, material: null, occasion: null, sense: null,
      });
    } else {
      Object.assign(row, {
        kind: kind.length ? kind : null,
        heritage: heritage.length ? heritage : null,
        material: material.length ? material : null,
        occasion: occasion.length ? occasion : null,
        sense: sense.length ? sense : null,
        reach: reach.length ? reach : null,
        // Clear dem fields
        field: null, role: null, affiliations: null, gender: null, status: null,
        details: null, origin: null,
      });
    }

    let result;
    if (isEdit) {
      result = await supabase.from("entities").update(row).eq("id", entity!.id);
    } else {
      result = await supabase.from("entities").insert(row);
    }

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
    } else {
      onSave();
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5 max-w-3xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display tracking-wider">
          {isEdit ? `Edit: ${entity!.name}` : "Add Entity"}
        </h2>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm !py-1.5">
          ← Back
        </button>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(["dem", "ting"] as GuessNahMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              mode === m ? "bg-brand-red text-brand-white" : "bg-surface-3 text-ink-muted border border-line"
            }`}
          >
            {m === "dem" ? "Dem Nah (People)" : "Ting Nah"}
          </button>
        ))}
      </div>

      {/* ── Common fields ──────────────────────────────────────────────────── */}
      <fieldset className="rounded-lg border border-line p-4 space-y-3">
        <legend className="text-xs font-semibold text-ink-muted px-2 uppercase tracking-wider">Basic Info</legend>

        {/* Image + Name/Aliases/Description side by side */}
        <div className="flex gap-5">
          {/* Image well */}
          <div
            className={`shrink-0 w-32 h-32 rounded-lg border-2 border-dashed relative overflow-hidden cursor-pointer
                        flex items-center justify-center transition-colors
                        ${dragOver ? "border-brand-red bg-brand-red/10" : "border-line hover:border-ink-muted"}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-ink-muted">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px]">Drop or click</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!uploading && imageUrl && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="text-white text-xs font-semibold">Replace</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) openCrop(f); }} />
          </div>

          {/* Name + Aliases + Description */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *" full>
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Aliases (comma-separated)" full>
                <input value={aliases} onChange={(e) => setAliases(e.target.value)} className={inputCls}
                       placeholder="Alias 1, Alias 2" />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        rows={2} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Field label="Era Start (year)">
            <input type="number" value={eraStart} onChange={(e) => setEraStart(e.target.value)}
                   placeholder="e.g. 1980" min={1500} max={2099} className={inputCls} />
          </Field>
          <Field label={eraOngoing ? "Era End — current" : "Era End (year)"}>
            <input type="number" value={eraOngoing ? "" : eraEnd}
                   onChange={(e) => setEraEnd(e.target.value)}
                   disabled={eraOngoing}
                   placeholder={eraOngoing ? "now" : "e.g. 1999"}
                   min={1500} max={2099}
                   className={`${inputCls} ${eraOngoing ? "opacity-50" : ""}`} />
            <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={eraOngoing}
                onChange={(e) => setEraOngoing(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-red"
              />
              Ongoing / still active (use current year)
            </label>
          </Field>
          <Field label="Difficulty">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                    className={inputCls}>
              {optionsFor("difficulty").map((o) => (
                <option key={o.value} value={o.value}>{o.display_label}</option>
              ))}
              {optionsFor("difficulty").length === 0 && (
                <>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </>
              )}
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-1.5 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" checked={guessEnabled} onChange={(e) => setGuessEnabled(e.target.checked)} className="rounded" />
              Guess Nah
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" checked={drawEnabled} onChange={(e) => setDrawEnabled(e.target.checked)} className="rounded" />
              Draw Nah
            </label>
          </div>
        </div>
      </fieldset>

      {/* ── Mode-specific attributes ───────────────────────────────────────── */}
      {mode === "dem" ? (
        <fieldset className="rounded-lg border border-line p-4 space-y-3">
          <legend className="text-xs font-semibold text-ink-muted px-2 uppercase tracking-wider">Dem Nah Attributes</legend>
          <div className="grid grid-cols-2 gap-3">
            <MultiSelect label="Field *" attr="field" values={field} onChange={setField} options={optionsFor("field")} onRefresh={loadOptions} />
            <MultiSelect label="Role *" attr="role" values={role} onChange={setRole} options={optionsFor("role")} onRefresh={loadOptions} />
            <MultiSelect label="Affiliations *" attr="affiliations" values={affiliations} onChange={setAffiliations} options={optionsFor("affiliations")} onRefresh={loadOptions} />
            <MultiSelect label="Gender *" attr="gender" values={gender} onChange={setGender} options={optionsFor("gender")} onRefresh={loadOptions} />
            <MultiSelect label="Status *" attr="status" values={status} onChange={setStatus} options={optionsFor("status")} onRefresh={loadOptions} />
            <MultiSelect label="Reach *" attr="reach" values={reach} onChange={setReach} options={optionsFor("reach")} onRefresh={loadOptions} />
            <MultiSelect label="Details *" attr="details" values={details} onChange={setDetails} options={optionsFor("details")} onRefresh={loadOptions} />
            <MultiSelect label="Origin *" attr="origin" values={origin} onChange={setOrigin} options={optionsFor("origin")} onRefresh={loadOptions} />
          </div>
        </fieldset>
      ) : (
        <fieldset className="rounded-lg border border-line p-4 space-y-3">
          <legend className="text-xs font-semibold text-ink-muted px-2 uppercase tracking-wider">Ting Nah Attributes</legend>
          <div className="grid grid-cols-2 gap-3">
            <MultiSelect label="Kind *" attr="kind" values={kind} onChange={setKind} options={optionsFor("kind")} onRefresh={loadOptions} />
            <MultiSelect label="Heritage *" attr="heritage" values={heritage} onChange={setHeritage} options={optionsFor("heritage")} onRefresh={loadOptions} />
            <MultiSelect label="Material *" attr="material" values={material} onChange={setMaterial} options={optionsFor("material")} onRefresh={loadOptions} />
            <MultiSelect label="Occasion *" attr="occasion" values={occasion} onChange={setOccasion} options={optionsFor("occasion")} onRefresh={loadOptions} />
            <MultiSelect label="Sense *" attr="sense" values={sense} onChange={setSense} options={optionsFor("sense")} onRefresh={loadOptions} />
            <MultiSelect label="Reach *" attr="reach" values={reach} onChange={setReach} options={optionsFor("reach")} onRefresh={loadOptions} />
          </div>
        </fieldset>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="text-sm text-brand-red bg-brand-red/10 rounded-lg px-3 py-2">{error}</motion.div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : isEdit ? "Update" : "Create"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>

      {/* Crop modal — overlays everything */}
      <AnimatePresence>
        {cropSrc && (
          <CropModal
            imageSrc={cropSrc}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </motion.form>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-muted focus:outline-none focus:border-brand-red";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block space-y-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

// ── Multi-select from attribute_options ──────────────────────────────────────

function MultiSelect({
  label,
  attr,
  values,
  onChange,
  options,
  onRefresh,
}: {
  label: string;
  attr: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: AttributeOption[];
  onRefresh: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [usageMsg, setUsageMsg] = useState<string | null>(null);

  function toggle(val: string) {
    onChange(
      values.includes(val) ? values.filter((v) => v !== val) : [...values, val],
    );
  }

  async function addNew() {
    const value = newVal.trim().toLowerCase().replace(/\s+/g, "_");
    const displayLabel = newLabel.trim() || newVal.trim();
    if (!value) return;
    await supabase.from("attribute_options").upsert(
      { attribute: attr, value, display_label: displayLabel, parent_group: newGroup.trim() || null, sort_order: options.length },
      { onConflict: "attribute,value" },
    );
    onChange([...values, value]);
    setAdding(false);
    setNewVal(""); setNewLabel(""); setNewGroup("");
    await onRefresh();
  }

  async function saveEdit(opt: AttributeOption) {
    await supabase.from("attribute_options")
      .update({ display_label: editLabel.trim(), parent_group: editGroup.trim() || null })
      .eq("id", opt.id);
    setEditing(null);
    await onRefresh();
  }

  async function handleDelete(opt: AttributeOption) {
    const { data: entities } = await supabase
      .from("entities")
      .select("id, name")
      .contains(attr, [opt.value]);

    if (entities && entities.length > 0) {
      const names = entities.slice(0, 10).map((e: { name: string }) => e.name).join(", ");
      const more = entities.length > 10 ? ` and ${entities.length - 10} more` : "";
      setUsageMsg(`Cannot delete "${opt.display_label}" — used by: ${names}${more}. Remove it from those entities first.`);
      return;
    }

    if (values.includes(opt.value)) {
      onChange(values.filter((v) => v !== opt.value));
    }
    await supabase.from("attribute_options").delete().eq("id", opt.id);
    await onRefresh();
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {options.map((o) => {
            const selected = values.includes(o.value);
            const isEditing = editing === o.id;

            if (isEditing) {
              return (
                <motion.div key={o.id} layout className="flex gap-1 items-center"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                    className={`${inputCls} !py-0.5 !text-xs w-24`} autoFocus />
                  <input value={editGroup} onChange={(e) => setEditGroup(e.target.value)}
                    placeholder="group" className={`${inputCls} !py-0.5 !text-xs w-20`} />
                  <button type="button" onClick={() => saveEdit(o)} className="text-[10px] text-green-500">✓</button>
                  <button type="button" onClick={() => setEditing(null)} className="text-[10px] text-ink-muted">✕</button>
                </motion.div>
              );
            }

            return (
              <motion.div key={o.id} layout className="group/opt relative"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}>
                <button type="button" onClick={() => toggle(o.value)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    selected
                      ? "bg-brand-red/20 border-brand-red text-brand-red font-semibold"
                      : "bg-surface-2 border-line text-ink-muted hover:border-ink-muted"
                  }`}>
                  {o.display_label}
                </button>
                <div className="absolute -top-1.5 -right-1.5 hidden group-hover/opt:flex gap-0.5">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(o.id); setEditLabel(o.display_label); setEditGroup(o.parent_group ?? ""); }}
                    className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center hover:bg-blue-600">✎</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(o); }}
                    className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center hover:bg-red-600">×</button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs px-2 py-1 rounded-md border border-dashed border-line text-ink-muted hover:border-brand-red hover:text-brand-red transition-colors"
          >
            + New
          </button>
        )}
      </div>

      <AnimatePresence>
        {usageMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="text-xs text-amber-500 bg-amber-500/10 rounded px-2 py-1.5 mt-1">
            {usageMsg}
            <button type="button" onClick={() => setUsageMsg(null)} className="ml-2 underline text-[10px]">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 items-end mt-1 overflow-hidden">
            <div className="space-y-0.5">
              <span className="text-[10px] text-ink-muted">Value (key)</span>
              <input
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                placeholder="e.g. cricket"
                className={`${inputCls} !py-1 !text-xs w-24`}
                autoFocus
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-ink-muted">Label</span>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Cricket"
                className={`${inputCls} !py-1 !text-xs w-24`}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-ink-muted">Group</span>
              <input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="optional"
                className={`${inputCls} !py-1 !text-xs w-20`}
              />
            </div>
            <button type="button" onClick={addNew} className="text-xs px-2 py-1 rounded border border-brand-red text-brand-red">
              Add
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs px-2 py-1 text-ink-muted">
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

