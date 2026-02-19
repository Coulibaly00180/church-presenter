import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderOpen, ImagePlus, Pencil, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PROJECTION_FONT_OPTIONS = [
  { label: "System UI", value: "system-ui" },
  { label: "Space Grotesk", value: "\"Space Grotesk\", system-ui, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "\"Trebuchet MS\", sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "\"Times New Roman\", Times, serif" },
] as const;

function fontFamilyFromFileName(fileName: string) {
  return fileName.replace(/\.(ttf|otf)$/i, "").trim() || "CustomFont";
}

function toFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("file://") || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const [pathOnly, frag] = path.split("#");
  const base =
    pathOnly.startsWith("\\\\")
      ? `file:${pathOnly.replace(/\\/g, "/")}`
      : `file:///${pathOnly.replace(/\\/g, "/")}`;
  return frag ? `${base}#${frag}` : base;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ProjectionSettings({ open, onOpenChange }: Props) {
  const [bg, setBg] = useState("#050505");
  const [bgMode, setBgMode] = useState<CpBackgroundFillMode>("SOLID");
  const [bgGradientFrom, setBgGradientFrom] = useState("#2563eb");
  const [bgGradientTo, setBgGradientTo] = useState("#7c3aed");
  const [bgGradientAngle, setBgGradientAngle] = useState(135);
  const [fg, setFg] = useState("#ffffff");
  const [fgMode, setFgMode] = useState<CpForegroundFillMode>("SOLID");
  const [fgGradientFrom, setFgGradientFrom] = useState("#ffffff");
  const [fgGradientTo, setFgGradientTo] = useState("#93c5fd");
  const [scale, setScale] = useState(1);
  const [textFont, setTextFont] = useState("system-ui");
  const [textFontPath, setTextFontPath] = useState("");
  const [fontPreviewFamily, setFontPreviewFamily] = useState("system-ui");
  const [fontValidation, setFontValidation] = useState("");
  const [fontValidationError, setFontValidationError] = useState(false);
  const [bgImage, setBgImage] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [imageFiles, setImageFiles] = useState<CpMediaFile[]>([]);
  const [fontFiles, setFontFiles] = useState<CpMediaFile[]>([]);
  const [libraryDir, setLibraryDir] = useState("");
  const [profilesSnapshot, setProfilesSnapshot] = useState<CpSettingsProfilesSnapshot>({ profiles: [], activeProfileId: null });
  const [mirrors, setMirrors] = useState<Partial<Record<ScreenKey, ScreenMirrorMode>>>({});

  const loadLibraryFiles = async () => {
    const media = await window.cp.files.listMedia();
    if (!media.ok) return;
    setLibraryDir(media.rootDir);
    setImageFiles(media.files.filter((file) => file.kind === "IMAGE"));
    setFontFiles(media.files.filter((file) => file.kind === "FONT"));
  };

  const loadProjectionState = async () => {
    const state = await window.cp.projection.getState();
    setBg(state.background || "#050505");
    setBgMode(state.backgroundMode || "SOLID");
    setBgGradientFrom(state.backgroundGradientFrom || "#2563eb");
    setBgGradientTo(state.backgroundGradientTo || "#7c3aed");
    setBgGradientAngle(state.backgroundGradientAngle ?? 135);
    setFg(state.foreground || "#ffffff");
    setFgMode(state.foregroundMode || "SOLID");
    setFgGradientFrom(state.foregroundGradientFrom || "#ffffff");
    setFgGradientTo(state.foregroundGradientTo || "#93c5fd");
    setScale(state.textScale || 1);
    setTextFont(state.textFont || "system-ui");
    setTextFontPath(state.textFontPath || "");
    setBgImage(state.backgroundImage || "");
    setLogoPath(state.logoPath || "");
  };

  const loadProfiles = async () => {
    const result = await window.cp.settings.getProfiles();
    if (!result.ok) {
      toast.error(result.error || "Profiles unavailable");
      return;
    }
    setProfilesSnapshot(result.snapshot);
  };

  const loadScreenMeta = async () => {
    const screens = await window.cp.screens.list();
    const next: Partial<Record<ScreenKey, ScreenMirrorMode>> = {};
    screens.forEach((entry) => {
      next[entry.key] = entry.mirror;
    });
    setMirrors(next);
  };

  const apply = (patch: {
    background?: string;
    backgroundMode?: CpBackgroundFillMode;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientAngle?: number;
    backgroundImage?: string;
    logoPath?: string;
    foreground?: string;
    foregroundMode?: CpForegroundFillMode;
    foregroundGradientFrom?: string;
    foregroundGradientTo?: string;
    textScale?: number;
    textFont?: string;
    textFontPath?: string;
  }) => {
    window.cp.projection.setAppearance(patch);
  };

  useEffect(() => {
    if (!open) return;
    void loadProjectionState();
    void loadLibraryFiles();
    void loadProfiles();
    void loadScreenMeta();
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    let mountedFace: FontFace | null = null;

    const loadFontPreview = async () => {
      setFontValidation("");
      setFontValidationError(false);
      setFontPreviewFamily(textFont || "system-ui");
      if (!textFontPath) return;

      const validation = await window.cp.files.validateFont({ path: textFontPath });
      if (!validation.ok) {
        if (!cancelled) {
          setFontValidation(validation.error || "Validation failed");
          setFontValidationError(true);
          setFontPreviewFamily("system-ui");
        }
        return;
      }
      if (!validation.valid) {
        if (!cancelled) {
          setFontValidation(validation.reason || "Invalid font file");
          setFontValidationError(true);
          setFontPreviewFamily("system-ui");
        }
        return;
      }

      const previewName = validation.family || textFont || "CustomFont";
      const runtimeFamily = `preview_${previewName.replace(/[^A-Za-z0-9_]/g, "_")}`;
      try {
        const face = new FontFace(runtimeFamily, `url("${toFileUrl(textFontPath)}")`);
        const loaded = await face.load();
        const fontSet = document.fonts as unknown as { add?: (font: FontFace) => void; delete?: (font: FontFace) => void };
        fontSet.add?.(loaded);
        mountedFace = loaded;
        if (!cancelled) {
          setFontValidation(`Font valid: ${previewName}`);
          setFontValidationError(false);
          setFontPreviewFamily(`"${runtimeFamily}", system-ui`);
        }
      } catch {
        if (!cancelled) {
          setFontValidation("Font load failed (corrupted or unreadable)");
          setFontValidationError(true);
          setFontPreviewFamily("system-ui");
        }
      }
    };

    void loadFontPreview();
    return () => {
      cancelled = true;
      if (mountedFace) {
        const fontSet = document.fonts as unknown as { add?: (font: FontFace) => void; delete?: (font: FontFace) => void };
        fontSet.delete?.(mountedFace);
      }
    };
  }, [textFont, textFontPath]);

  const pickImage = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.mediaType === "IMAGE" && "path" in result) {
      setBgImage(result.path);
      apply({ backgroundImage: result.path });
      await loadLibraryFiles();
    }
  };

  const pickLogo = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.mediaType === "IMAGE" && "path" in result) {
      setLogoPath(result.path);
      apply({ logoPath: result.path });
      await loadLibraryFiles();
    }
  };

  const pickFont = async () => {
    const result = await window.cp.files.pickFont();
    if (!result.ok || !("path" in result)) {
      if (!result.ok && "error" in result) toast.error(result.error || "Font import failed");
      return;
    }

    await loadLibraryFiles();
    const validation = await window.cp.files.validateFont({ path: result.path });
    if (!validation.ok || !validation.valid) {
      toast.error(validation.ok ? (validation.reason || "Invalid font file") : validation.error);
      return;
    }

    const guessedFamily = fontFamilyFromFileName(result.path.split(/[\\/]/).pop() || "");
    setTextFont(guessedFamily);
    setTextFontPath(result.path);
    apply({ textFont: guessedFamily, textFontPath: result.path });
    toast.success("Font imported");
  };

  const renameSelectedFont = async () => {
    if (!textFontPath) return;
    const selectedFile = fontFiles.find((file) => file.path === textFontPath);
    const defaultName = selectedFile?.name || textFontPath.split(/[\\/]/).pop() || "";
    const nextNameRaw = window.prompt("New font name", defaultName);
    if (!nextNameRaw?.trim()) return;

    const result = await window.cp.files.renameMedia({ path: textFontPath, name: nextNameRaw.trim() });
    if (!result.ok) {
      toast.error(result.error || "Rename failed");
      return;
    }

    const nextFamily = fontFamilyFromFileName(result.name);
    setTextFont(nextFamily);
    setTextFontPath(result.path);
    apply({ textFont: nextFamily, textFontPath: result.path });
    await loadLibraryFiles();
    toast.success("Font renamed");
  };

  const deleteSelectedFont = async () => {
    if (!textFontPath) return;
    const selectedFile = fontFiles.find((file) => file.path === textFontPath);
    const confirmed = window.confirm(`Delete font ${selectedFile?.name || textFontPath}?`);
    if (!confirmed) return;

    const result = await window.cp.files.deleteMedia({ path: textFontPath });
    if (!result.ok) {
      toast.error(result.error || "Delete failed");
      return;
    }

    setTextFont("system-ui");
    setTextFontPath("");
    apply({ textFont: "system-ui", textFontPath: "" });
    await loadLibraryFiles();
    toast.success("Font deleted");
  };

  const chooseLibraryDir = async () => {
    const result = await window.cp.files.chooseLibraryDir();
    if (!result.ok) {
      if ("error" in result) toast.error(result.error || "Unable to update media folder");
      return;
    }
    setLibraryDir(result.path);
    await loadLibraryFiles();
    await loadProfiles();
    toast.success("Media folder updated");
  };

  const saveActiveProfile = async () => {
    const result = await window.cp.settings.saveActiveProfile();
    if (!result.ok) {
      toast.error(result.error || "Profile save failed");
      return;
    }
    setProfilesSnapshot(result.snapshot);
    toast.success(`Profile saved: ${result.profile.name}`);
  };

  const createProfile = async () => {
    const name = window.prompt("Profile name", "Nouvelle assemblee");
    if (!name?.trim()) return;
    const result = await window.cp.settings.createProfile({ name: name.trim() });
    if (!result.ok) {
      toast.error(result.error || "Profile creation failed");
      return;
    }
    setProfilesSnapshot(result.snapshot);
    await loadProjectionState();
    await loadLibraryFiles();
    await loadScreenMeta();
    toast.success(`Profile created: ${result.profile.name}`);
  };

  const activateProfile = async (profileId: string) => {
    const result = await window.cp.settings.activateProfile({ profileId });
    if (!result.ok) {
      toast.error(result.error || "Profile activation failed");
      return;
    }
    setProfilesSnapshot(result.snapshot);
    await loadProjectionState();
    await loadLibraryFiles();
    await loadScreenMeta();
    toast.success(`Profile loaded: ${result.profile.name}`);
  };

  const renameActiveProfile = async () => {
    const active = profilesSnapshot.profiles.find((profile) => profile.id === profilesSnapshot.activeProfileId);
    if (!active) return;
    const name = window.prompt("Rename profile", active.name);
    if (!name?.trim()) return;
    const result = await window.cp.settings.renameProfile({ profileId: active.id, name: name.trim() });
    if (!result.ok) {
      toast.error(result.error || "Rename failed");
      return;
    }
    setProfilesSnapshot(result.snapshot);
    toast.success("Profile renamed");
  };

  const deleteActiveProfile = async () => {
    const active = profilesSnapshot.profiles.find((profile) => profile.id === profilesSnapshot.activeProfileId);
    if (!active) return;
    const confirmed = window.confirm(`Delete profile ${active.name}?`);
    if (!confirmed) return;
    const result = await window.cp.settings.deleteProfile({ profileId: active.id });
    if (!result.ok) {
      toast.error(result.error || "Delete failed");
      return;
    }
    setProfilesSnapshot(result.snapshot);
    await loadProjectionState();
    await loadLibraryFiles();
    await loadScreenMeta();
    toast.success("Profile deleted");
  };

  const setMirror = async (key: "B" | "C", mirror: ScreenMirrorMode) => {
    const result = await window.cp.screens.setMirror(key, mirror);
    if (!result.ok) return;
    setMirrors((prev) => ({ ...prev, [key]: result.mirror }));
    await loadProfiles();
  };

  const clearImage = () => {
    setBgImage("");
    apply({ backgroundImage: "" });
  };

  const clearLogo = () => {
    setLogoPath("");
    apply({ logoPath: "" });
  };

  const activeProfile =
    profilesSnapshot.profiles.find((profile) => profile.id === profilesSnapshot.activeProfileId) || null;
  const mirrorB = mirrors.B || { kind: "MIRROR", from: "A" as ScreenKey };
  const mirrorC = mirrors.C || { kind: "MIRROR", from: "A" as ScreenKey };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,760px)] max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Projection appearance</DialogTitle>
          <DialogDescription>Edit colors, text size, fonts, and media branding.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-md border p-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Assembly profile</Label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={createProfile}>
                  New
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={renameActiveProfile} disabled={!activeProfile}>
                  <Pencil className="h-3 w-3 mr-1" /> Rename
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={deleteActiveProfile} disabled={!activeProfile}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={saveActiveProfile} disabled={!activeProfile}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="h-8 min-w-[220px] flex-1 rounded border bg-background px-2 text-xs"
                value={profilesSnapshot.activeProfileId || ""}
                onChange={(event) => {
                  const profileId = event.target.value;
                  if (!profileId) return;
                  void activateProfile(profileId);
                }}
              >
                {profilesSnapshot.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={loadProfiles}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Active profile stores logo, colors, fonts, media folder, and screen mappings.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs">Media folder</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={chooseLibraryDir}>
                  <FolderOpen className="h-3 w-3 mr-1" /> Change
                </Button>
                <span className="text-[10px] text-muted-foreground truncate" title={libraryDir}>
                  {libraryDir || "No folder selected"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="space-y-1 rounded border p-2">
                <Label className="text-[10px]">Screen B mapping</Label>
                <div className="flex items-center gap-1.5">
                  <select
                    className="h-7 rounded border bg-background px-2 text-[10px]"
                    value={mirrorB.kind}
                    onChange={(event) => {
                      const mode = event.target.value as "FREE" | "MIRROR";
                      void setMirror("B", mode === "FREE" ? { kind: "FREE" } : { kind: "MIRROR", from: "A" });
                    }}
                  >
                    <option value="FREE">Free</option>
                    <option value="MIRROR">Mirror</option>
                  </select>
                  {mirrorB.kind === "MIRROR" && (
                    <select
                      className="h-7 rounded border bg-background px-2 text-[10px]"
                      value={mirrorB.from}
                      onChange={(event) => {
                        const from = event.target.value as ScreenKey;
                        if (from === "B") return;
                        void setMirror("B", { kind: "MIRROR", from });
                      }}
                    >
                      <option value="A">From A</option>
                      <option value="C">From C</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="space-y-1 rounded border p-2">
                <Label className="text-[10px]">Screen C mapping</Label>
                <div className="flex items-center gap-1.5">
                  <select
                    className="h-7 rounded border bg-background px-2 text-[10px]"
                    value={mirrorC.kind}
                    onChange={(event) => {
                      const mode = event.target.value as "FREE" | "MIRROR";
                      void setMirror("C", mode === "FREE" ? { kind: "FREE" } : { kind: "MIRROR", from: "A" });
                    }}
                  >
                    <option value="FREE">Free</option>
                    <option value="MIRROR">Mirror</option>
                  </select>
                  {mirrorC.kind === "MIRROR" && (
                    <select
                      className="h-7 rounded border bg-background px-2 text-[10px]"
                      value={mirrorC.from}
                      onChange={(event) => {
                        const from = event.target.value as ScreenKey;
                        if (from === "C") return;
                        void setMirror("C", { kind: "MIRROR", from });
                      }}
                    >
                      <option value="A">From A</option>
                      <option value="B">From B</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Background mode</Label>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={bgMode}
                onChange={(event) => {
                  const next = event.target.value as CpBackgroundFillMode;
                  setBgMode(next);
                  apply({ backgroundMode: next });
                }}
              >
                <option value="SOLID">Solid</option>
                <option value="GRADIENT_LINEAR">Linear gradient</option>
                <option value="GRADIENT_RADIAL">Radial gradient</option>
              </select>
            </div>
            {bgMode === "SOLID" ? (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Background color</Label>
                <input
                  type="color"
                  value={bg}
                  onChange={(event) => {
                    setBg(event.target.value);
                    apply({ background: event.target.value });
                  }}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Color A</Label>
                  <input
                    type="color"
                    value={bgGradientFrom}
                    onChange={(event) => {
                      setBgGradientFrom(event.target.value);
                      apply({ backgroundGradientFrom: event.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Color B</Label>
                  <input
                    type="color"
                    value={bgGradientTo}
                    onChange={(event) => {
                      setBgGradientTo(event.target.value);
                      apply({ backgroundGradientTo: event.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
                {bgMode === "GRADIENT_LINEAR" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Angle</Label>
                      <span className="text-xs text-muted-foreground font-mono">{bgGradientAngle}deg</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={bgGradientAngle}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setBgGradientAngle(next);
                        apply({ backgroundGradientAngle: next });
                      }}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Text mode</Label>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={fgMode}
                onChange={(event) => {
                  const next = event.target.value as CpForegroundFillMode;
                  setFgMode(next);
                  apply({ foregroundMode: next });
                }}
              >
                <option value="SOLID">Solid</option>
                <option value="GRADIENT">Gradient</option>
              </select>
            </div>
            {fgMode === "SOLID" ? (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Text color</Label>
                <input
                  type="color"
                  value={fg}
                  onChange={(event) => {
                    setFg(event.target.value);
                    apply({ foreground: event.target.value });
                  }}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Color A</Label>
                  <input
                    type="color"
                    value={fgGradientFrom}
                    onChange={(event) => {
                      setFgGradientFrom(event.target.value);
                      apply({ foregroundGradientFrom: event.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Color B</Label>
                  <input
                    type="color"
                    value={fgGradientTo}
                    onChange={(event) => {
                      setFgGradientTo(event.target.value);
                      apply({ foregroundGradientTo: event.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Text size</Label>
              <span className="text-xs text-muted-foreground font-mono">{scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={(event) => {
                const next = parseFloat(event.target.value);
                setScale(next);
                apply({ textScale: next });
              }}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Text font</Label>
            <select
              className="h-8 w-full rounded border bg-background px-2 text-xs"
              value={textFont}
              onChange={(event) => {
                const next = event.target.value;
                setTextFont(next);
                setTextFontPath("");
                apply({ textFont: next, textFontPath: "" });
              }}
            >
              {PROJECTION_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom font (.ttf/.otf)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="h-8 min-w-[220px] flex-1 rounded border bg-background px-2 text-xs"
                value={textFontPath}
                onChange={async (event) => {
                  const path = event.target.value;
                  if (!path) {
                    setTextFontPath("");
                    apply({ textFontPath: "" });
                    return;
                  }
                  const validation = await window.cp.files.validateFont({ path });
                  if (!validation.ok) {
                    toast.error(validation.error || "Validation failed");
                    return;
                  }
                  if (!validation.valid) {
                    toast.error(validation.reason || "Invalid font file");
                    return;
                  }
                  const file = fontFiles.find((entry) => entry.path === path);
                  const family = fontFamilyFromFileName(file?.name || path.split(/[\\/]/).pop() || "");
                  setTextFont(family);
                  setTextFontPath(path);
                  apply({ textFont: family, textFontPath: path });
                }}
              >
                <option value="">None</option>
                {fontFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={pickFont}>
                <ImagePlus className="h-3 w-3 mr-1" /> Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={renameSelectedFont}
                disabled={!textFontPath}
              >
                <Pencil className="h-3 w-3 mr-1" /> Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive"
                disabled={!textFontPath}
                onClick={() => {
                  setTextFontPath("");
                  apply({ textFontPath: "" });
                }}
              >
                Detach
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive"
                onClick={deleteSelectedFont}
                disabled={!textFontPath}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={loadLibraryFiles}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
            <div className="rounded-md border p-2 space-y-1">
              <p className={`text-[10px] ${fontValidationError ? "text-destructive" : "text-muted-foreground"}`}>
                {fontValidation || "Select a font to validate and preview it."}
              </p>
              <p className="text-sm rounded border bg-muted/20 px-2 py-1.5" style={{ fontFamily: fontPreviewFamily }}>
                Preview: ABCDEFG abcdefg 012345
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Background image</Label>
            <div className="flex items-center gap-2">
              {bgImage && (
                <img
                  src={toFileUrl(bgImage)}
                  alt=""
                  className="h-10 w-16 object-cover rounded border"
                />
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickImage}>
                <ImagePlus className="h-3 w-3 mr-1" /> Choose...
              </Button>
              {bgImage && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearImage}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {!bgImage && <p className="text-[10px] text-muted-foreground">No image selected</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Logo (top right)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="h-7 min-w-[220px] flex-1 rounded-md border bg-background px-2 text-xs"
                value={logoPath}
                onChange={(event) => {
                  const value = event.target.value;
                  setLogoPath(value);
                  apply({ logoPath: value });
                }}
              >
                <option value="">No logo</option>
                {imageFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadLibraryFiles} title="Refresh">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickLogo}>
                <ImagePlus className="h-3 w-3 mr-1" /> Import
              </Button>
              {logoPath && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearLogo}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Choose a logo from media/images to display it at top right.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
