"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { reportsApi } from "@/lib/api";
import { LabReport, ReportStatus } from "@/types";

const statusConfig: Record<ReportStatus, { label: string; color: string }> = {
  pending:    { label: "Pending",    color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  processing: { label: "Processing", color: "text-blue-700 bg-blue-50 border-blue-200" },
  completed:  { label: "Completed",  color: "text-green-700 bg-green-50 border-green-200" },
  failed:     { label: "Failed",     color: "text-red-700 bg-red-50 border-red-200" },
};

export default function HistoryPage() {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchReports = () => {
    setLoading(true);
    reportsApi.list().then((r) => setReports(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this report? This action cannot be undone.")) return;
    setDeleting(id);
    try {
      await reportsApi.delete(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lab History</h1>
          <p className="text-sm text-[#57606a] mt-1">All your uploaded lab reports.</p>
        </div>
        <Link
          href="/upload"
          className="px-4 py-2 bg-[#3b82d4] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Upload New
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#3b82d4] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-16 text-center">
          <p className="text-[#57606a] text-sm">No lab reports yet.</p>
          <Link href="/upload" className="mt-3 inline-block text-sm text-[#3b82d4] hover:underline">
            Upload your first lab result →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f7f8fa] text-left">
                <th className="px-4 py-3 font-medium text-[#57606a]">File</th>
                <th className="px-4 py-3 font-medium text-[#57606a]">Date</th>
                <th className="px-4 py-3 font-medium text-[#57606a]">Status</th>
                <th className="px-4 py-3 font-medium text-[#57606a] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, i) => {
                const cfg = statusConfig[report.status];
                return (
                  <tr key={report.id} className={`${i < reports.length - 1 ? "border-b border-[#e5e7eb]" : ""}`}>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium truncate">{report.original_filename || `Report #${report.id}`}</p>
                    </td>
                    <td className="px-4 py-3 text-[#57606a] whitespace-nowrap">
                      {new Date(report.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 border rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {report.status === "completed" && (
                        <Link href={`/reports/${report.id}`} className="text-[#3b82d4] hover:underline mr-3">
                          View
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(report.id)}
                        disabled={deleting === report.id}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deleting === report.id ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
