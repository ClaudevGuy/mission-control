"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader, GlassPanel } from "@/components/shared";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [landingPage, setLandingPage] = useState("/overview");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [numberFormat, setNumberFormat] = useState("1,000");
  const [emailDigest, setEmailDigest] = useState("weekly");

  // Load profile from API
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const user = d.data?.user;
        if (user) {
          setName(user.name || "");
          setDisplayName(user.displayName || user.name || "");
          setEmail(user.email || "");
          setJobTitle(user.jobTitle || "");
          setTimezone(user.timezone || "UTC");
          setAvatar(user.avatar || user.image || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load preferences from localStorage
    const prefs = localStorage.getItem("profile-prefs");
    if (prefs) {
      try {
        const p = JSON.parse(prefs);
        if (p.landingPage) setLandingPage(p.landingPage);
        if (p.dateFormat) setDateFormat(p.dateFormat);
        if (p.numberFormat) setNumberFormat(p.numberFormat);
        if (p.emailDigest) setEmailDigest(p.emailDigest);
      } catch {}
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      // Save immediately
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: dataUrl }),
      }).then((r) => {
        if (r.ok) toast.success("Profile picture updated");
        else toast.error("Failed to update picture");
      }).catch(() => toast.error("Failed to update picture"));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName, jobTitle, timezone }),
      });
      if (!res.ok) throw new Error("Failed to save");

      // Save preferences to localStorage
      localStorage.setItem("profile-prefs", JSON.stringify({ landingPage, dateFormat, numberFormat, emailDigest }));

      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "MC";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-5 mr-2 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Manage your personal settings and preferences" />

      {/* ─── Profile Header ─── */}
      <GlassPanel padding="lg">
        <div className="flex items-start gap-6">
          <div className="relative group shrink-0" onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer" }}>
            {avatar && avatar.length > 5 ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="Profile" className="size-20 rounded-full object-cover" />
            ) : (
              <div className="size-20 rounded-full bg-[#00d992]/15 flex items-center justify-center text-2xl font-bold text-[#00d992]">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-[#39FF14] border-[3px] border-card" style={{ boxShadow: "0 0 6px rgba(57,255,20,0.5)" }} />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="size-5 text-white/80" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-semibold text-foreground">{name || "Set your name"}</h2>
              <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(0,217,146,0.12)", border: "1px solid rgba(0,217,146,0.3)", color: "#00d992" }}>
                Admin
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{email || "No email set"}</p>
            {jobTitle && <p className="text-xs text-muted-foreground mt-0.5">{jobTitle}</p>}
          </div>
        </div>
      </GlassPanel>

      {/* ─── Personal Info ─── */}
      <GlassPanel padding="lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00d992]/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00d992]/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email</label>
            <input value={email} disabled className="h-9 w-full rounded-lg border border-border bg-muted/20 px-3 text-sm text-muted-foreground outline-none cursor-not-allowed" />
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Email cannot be changed</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Job Title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. CTO, Engineer, Designer" className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-[#00d992]/50" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-9 w-full max-w-sm rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none">
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="Asia/Jerusalem">Asia/Jerusalem (IST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        <Button className="mt-4 bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Saving...</> : "Save Changes"}
        </Button>
      </GlassPanel>

      {/* ─── Preferences ─── */}
      <GlassPanel padding="lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Default Landing Page</label>
            <select value={landingPage} onChange={(e) => setLandingPage(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none">
              <option value="/overview">Overview</option>
              <option value="/agents">AI Agents</option>
              <option value="/logs">Logs</option>
              <option value="/deployments">Deployments</option>
              <option value="/costs">Costs & Billing</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date Format</label>
            <div className="flex gap-1.5">
              {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((f) => (
                <button key={f} onClick={() => setDateFormat(f)} className={cn("rounded-md px-3 py-1.5 text-xs font-mono transition-colors", dateFormat === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Number Format</label>
            <div className="flex gap-1.5">
              {["1,000", "1.000"].map((f) => (
                <button key={f} onClick={() => setNumberFormat(f)} className={cn("rounded-md px-3 py-1.5 text-xs font-mono transition-colors", numberFormat === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email Digest</label>
            <div className="flex gap-1.5">
              {[{ k: "daily", l: "Daily" }, { k: "weekly", l: "Weekly" }, { k: "never", l: "Never" }].map((f) => (
                <button key={f.k} onClick={() => setEmailDigest(f.k)} className={cn("rounded-md px-3 py-1.5 text-xs transition-colors", emailDigest === f.k ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button className="mt-4 bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Saving...</> : "Save Preferences"}
        </Button>
      </GlassPanel>
    </div>
  );
}
