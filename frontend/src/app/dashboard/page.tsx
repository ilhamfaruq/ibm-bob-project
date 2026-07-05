"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { reportsApi } from "@/lib/api";
import { LabReport, ReportStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";

const statusConfig: Record<ReportStatus, { label: string; color: string; dot: string }> = {
  pending:    { label: "Pending",    color: "text-yellow-700 bg-yellow-50 border-yellow-200",   dot: "bg-yellow-400" },
  processing: { label: "Processing", color: "text-blue-700 bg-blue-50 border-blue-200",         dot: "bg-blue-400" },
  completed:  { label: "Completed",  color: "text-green-700 bg-green-50 border-green-200",      dot: "bg-green-500" },
  failed:     { label: "Failed",     color: "text-red-700 bg-red-50 border-red-200",            dot: "bg-red-500" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.list().then((r) => setReports(r.data)).finally(() => setLoading(false));
  }, []);

  const recent = reports.slice(0, 5);
  const completedCount = reports.filter((r) => r.status === "completed").length;
  const abnormalCount = reports.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-[#57606a] mt-1">Upload your blood lab results and get AI-powered educational interpretations.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Reports", value: reports.length },
          { label: "Completed", value: completedCount },
          { label: "Processing/Pending", value: reports.filter((r) => r.status === "pending" || r.status === "processing").length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-2xl font-bold text-[#1f2328]">{stat.value}</p>
            <p className="text-xs text-[#57606a] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-[#f0f6ff] border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-[#1f2328]">Upload a new lab result</h2>
          <p className="text-sm text-[#57606a] mt-0.5">PDF or image — we&apos;ll extract and interpret it for you.</p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3b82d4] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          Upload Lab Result
        </Link>
      </div>

      {/* Recent Reports */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent Reports</h2>
          <Link href="/history" className="text-sm text-[#3b82d4] hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#3b82d4] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 text-center text-[#57606a] text-sm">
            No reports yet. Upload your first lab result above!
          </div>
        ) : (
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            {recent.map((report, i) => {
              const cfg = statusConfig[report.status];
              return (
                <div key={report.id} className={`flex items-center justify-between p-4 ${i < recent.length - 1 ? "border-b border-[#e5e7eb]" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{report.original_filename || `Report #${report.id}`}</p>
                      <p className="text-xs text-[#57606a]">{new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 border rounded-full ${cfg.color}`}>{cfg.label}</span>
                    {report.status === "completed" && (
                      <Link href={`/reports/${report.id}`} className="text-xs text-[#3b82d4] hover:underline">
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <strong>⚠️ Important Disclaimer:</strong> LabInsight AI provides educational information only. All results must be discussed with a qualified healthcare professional. This tool does not provide medical diagnosis.
      </div>
    </div>
  );
}
