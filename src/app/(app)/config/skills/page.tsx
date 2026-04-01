"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api, ApiSetting } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import {
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  CloudArrowUpIcon,
  PlusIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";

interface Skill {
  filename: string;
  status: "Active" | "Inactive";
  version: string;
  uploaded: string;
  description: string;
}

const DEFAULT_SKILLS: Skill[] = [
  { filename: "geopolitical_analysis.skill", status: "Active", version: "v1.2.3", uploaded: "Oct 25, 2023", description: "Analyzes geopolitical events using game theory" },
  { filename: "conflict_prediction.skill", status: "Active", version: "v2.1.0", uploaded: "Oct 24, 2023", description: "Predicts potential conflicts based on data patterns" },
  { filename: "market_sentiment.skill", status: "Active", version: "v1.0.5", uploaded: "Oct 20, 2023", description: "Evaluates market sentiment from social media and news" },
  { filename: "economic_impact.skill", status: "Inactive", version: "v1.1.2", uploaded: "Sep 15, 2023", description: "Estimates economic impact of events and policies" },
  { filename: "diplomatic_relations.skill", status: "Active", version: "v1.3.1", uploaded: "Oct 22, 2023", description: "Assesses strength and dynamics of diplomatic ties" },
  { filename: "military_assessment.skill", status: "Active", version: "v2.0.0", uploaded: "Oct 18, 2023", description: "Provides assessments on military capabilities and posture" },
];

function StatusBadge({ status }: { status: Skill["status"] }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-semibold border",
      status === "Active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"
    )}>
      {status}
    </span>
  );
}

export default function SkillsPage() {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVersion, setNewVersion] = useState("v1.0.0");
  const [saving, setSaving] = useState(false);

  const { data: savedSkills, live, refresh } = useApiData<ApiSetting[]>({
    fetcher: () => api.settings("skills"),
    fallback: [],
    pollInterval: 0,
  });

  const customSkills: Skill[] = savedSkills.map((s) => {
    try {
      const parsed = JSON.parse(s.value);
      return {
        filename: s.key,
        status: "Active" as const,
        version: parsed.version || "v1.0.0",
        uploaded: new Date(s.updated_at).toLocaleDateString(),
        description: parsed.description || "",
      };
    } catch {
      return {
        filename: s.key,
        status: "Active" as const,
        version: "v1.0.0",
        uploaded: "",
        description: s.value,
      };
    }
  });

  const allSkills = [...customSkills, ...DEFAULT_SKILLS.filter(
    (d) => !customSkills.some((c) => c.filename === d.filename)
  )];

  const handleUpload = useCallback(async () => {
    if (!newName) return;
    setSaving(true);
    try {
      await api.saveSetting(
        newName.endsWith(".skill") ? newName : `${newName}.skill`,
        JSON.stringify({ description: newDesc, version: newVersion }),
        "skills"
      );
      setNewName("");
      setNewDesc("");
      setNewVersion("v1.0.0");
      refresh();
    } catch { /* ignore */ }
    setSaving(false);
  }, [newName, newDesc, newVersion, refresh]);

  const handleDelete = useCallback(async (key: string) => {
    try {
      await api.deleteSetting(key);
      refresh();
    } catch { /* ignore */ }
  }, [refresh]);

  const activeCount = allSkills.filter((s) => s.status === "Active").length;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-navy">Skills Management</h1>
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider",
            live ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600",
          )}>
            {live ? "SYNCED" : "LOCAL"}
          </span>
        </div>
        <button className="flex items-center gap-1.5 bg-brand text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:bg-brand-mid transition-colors">
          <PlusIcon className="w-4 h-4" />
          Upload New Skill
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold text-navy mb-3">Uploaded Skills</h2>
          <div className="grid grid-cols-3 gap-3">
            {allSkills.map((skill) => (
              <div key={skill.filename} className="bg-card border border-blue-200 rounded-lg p-4 flex flex-col gap-2.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                    <DocumentIcon className="w-4.5 h-4.5 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-navy truncate">{skill.filename}</span>
                      <StatusBadge status={skill.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] font-medium text-navy/70">{skill.version}</span>
                      <span className="text-[11px] text-muted">Uploaded: {skill.uploaded}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{skill.description}</p>
                <div className="flex items-center gap-3 pt-1 border-t border-border">
                  <button className="text-brand hover:text-brand-mid transition-colors"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(skill.filename)} className="text-brand hover:text-brand-mid transition-colors"><TrashIcon className="w-4 h-4" /></button>
                  <button className="text-brand hover:text-brand-mid transition-colors"><ArrowDownTrayIcon className="w-4 h-4" /></button>
                  <button className="text-brand hover:text-brand-mid transition-colors"><PlayIcon className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[280px] shrink-0">
          <h2 className="text-[14px] font-semibold text-navy mb-3">Skill Statistics</h2>
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-[11px] text-muted mb-1.5">Total Skills</div>
              <div className="text-[20px] font-bold text-navy">{allSkills.length}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-[11px] text-muted mb-1.5">Active Skills</div>
              <div className="text-[20px] font-bold text-navy">{activeCount}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-[11px] text-muted mb-1.5">Custom Skills</div>
              <div className="text-[20px] font-bold text-navy">{customSkills.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload New Skill */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-[14px] font-semibold text-navy mb-4">Upload New Skill</h2>
        <div className="flex gap-5">
          <div className="flex-1 border-2 border-dashed border-brand/40 rounded-lg flex flex-col items-center justify-center py-10 hover:border-brand/70 hover:bg-brand/5 transition-colors cursor-pointer">
            <CloudArrowUpIcon className="w-10 h-10 text-brand/50 mb-2" />
            <p className="text-[12px] text-muted">Drag <span className="font-medium text-navy">.skill</span> files here or click to browse</p>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-navy mb-1">Skill Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter skill name"
                className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-[12px] text-navy placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-navy mb-1">Description</label>
              <textarea rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe what this skill does"
                className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-[12px] text-navy placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand resize-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-navy mb-1">Version</label>
              <input type="text" value={newVersion} onChange={(e) => setNewVersion(e.target.value)}
                placeholder="e.g. v1.0.0"
                className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-[12px] text-navy placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand" />
            </div>
            <button onClick={handleUpload} disabled={saving || !newName}
              className="bg-green-600 text-white text-[12px] font-medium px-5 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
              {saving ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
