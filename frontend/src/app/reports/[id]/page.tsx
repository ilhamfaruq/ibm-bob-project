"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { reportsApi } from "@/lib/api";
import { ReportDetail, LabParameter, ParameterStatus } from "@/types";

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig: Record<
  ParameterStatus,
  { label: string; emoji: string; bg: string; border: string; text: string }
> = {
  normal:       { label: "Normal",            emoji: "🟢", bg: "bg-green-50",  border: "border-green-200",  text: "text-green-800" },
  slightly_high:{ label: "Slightly High",     emoji: "🟡", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800" },
  slightly_low: { label: "Slightly Low",      emoji: "🟡", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800" },
  high:         { label: "High",              emoji: "🔴", bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800" },
  low:          { label: "Low",               emoji: "🔴", bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParameterCard({ param }: { param: LabParameter }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[param.status as ParameterStatus] ?? statusConfig.normal;

  const refText =
    param.reference_min !== null && param.reference_max !== null
      ? `${param.reference_min}${param.reference_max === 999 ? "+" : `–${param.reference_max}`} ${param.unit ?? ""}`
      : null;

  // Compute gauge percentage
  let gaugePct: number | null = null;
  if (param.reference_min !== null && param.reference_max !== null && param.reference_max !== 999) {
    const range = param.reference_max - param.reference_min;
    const buffer = range * 0.5;
    const total = range + buffer * 2;
    gaugePct = Math.max(0, Math.min(100, ((param.value - (param.reference_min - buffer)) / total) * 100));
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.border}`}>
      <div
        className={`flex items-center justify-between p-4 cursor-pointer ${cfg.bg}`}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{cfg.emoji}</span>
          <div>
            <p className="font-medium text-sm text-[#1f2328]">{param.parameter_name}</p>
            {refText && <p className="text-xs text-[#57606a]">Ref: {refText}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="font-bold text-base text-[#1f2328]">
              {param.value} <span className="text-xs font-normal text-[#57606a]">{param.unit}</span>
            </p>
            <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
          </div>
          <svg
            className={`w-4 h-4 text-[#57606a] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Gauge bar */}
      {gaugePct !== null && (
        <div className="px-4 py-1 bg-white">
          <div className="relative h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
            {/* Normal zone */}
            <div
              className="absolute top-0 h-full bg-green-200 rounded-full"
              style={{
                left: "33.3%",
                width: "33.3%",
              }}
            />
            {/* Value marker */}
            <div
              className={`absolute top-0 w-2.5 h-2.5 rounded-full -translate-y-1/4 -translate-x-1/2 border-2 border-white ${
                param.status === "normal" ? "bg-green-500" :
                param.status.includes("slightly") ? "bg-yellow-400" : "bg-red-500"
              }`}
              style={{ left: `${gaugePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded explanation */}
      {expanded && param.explanation && (
        <div className="px-4 py-3 bg-white border-t border-[#e5e7eb]">
          <p className="text-sm text-[#1f2328] leading-relaxed">{param.explanation}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ count, status }: { count: number; status: ParameterStatus }) {
  const cfg = statusConfig[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${cfg.bg} ${cfg.border}`}>
      <span>{cfg.emoji}</span>
      <div>
        <p className={`text-lg font-bold ${cfg.text}`}>{count}</p>
        <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const reportId = Number(params.id);

  const fetchDetail = async () => {
    try {
      const res = await reportsApi.get(reportId);
      setDetail(res.data);
      return res.data;
    } catch {
      router.push("/history");
    }
  };

  useEffect(() => {
    fetchDetail().then((data) => {
      setLoading(false);
      if (data?.report?.status === "pending" || data?.report?.status === "processing") {
        setPolling(true);
      }
    });
  }, [reportId]);

  // Poll while processing
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const data = await fetchDetail();
      if (data?.report?.status === "completed" || data?.report?.status === "failed") {
        setPolling(false);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#3b82d4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) return null;

  const { report, parameters, clinical_summary } = detail;

  if (report.status === "pending" || report.status === "processing") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 border-4 border-[#3b82d4] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-semibold">Analyzing your lab report…</h2>
        <p className="text-sm text-[#57606a]">
          Our AI agent is extracting parameters, checking reference ranges, and composing educational interpretations.
          This usually takes 15–30 seconds.
        </p>
        <p className="text-xs text-[#57606a]">This page refreshes automatically.</p>
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-lg font-semibold">Analysis failed</h2>
        <p className="text-sm text-[#57606a]">
          We couldn&apos;t extract parameters from this file. Please ensure the file is a clear, readable lab report image or PDF.
        </p>
        <Link href="/upload" className="inline-block mt-2 text-sm text-[#3b82d4] hover:underline">
          Try uploading again →
        </Link>
      </div>
    );
  }

  const normalCount = parameters.filter((p) => p.status === "normal").length;
  const slightlyAbnormal = parameters.filter((p) => p.status === "slightly_high" || p.status === "slightly_low").length;
  const severeAbnormal = parameters.filter((p) => p.status === "high" || p.status === "low").length;

  const abnormalParams = parameters.filter((p) => p.status !== "normal");
  const normalParams = parameters.filter((p) => p.status === "normal");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#57606a]">
        <Link href="/history" className="hover:text-[#1f2328]">History</Link>
        <span>/</span>
        <span className="text-[#1f2328]">{report.original_filename || `Report #${report.id}`}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{report.original_filename || `Lab Report #${report.id}`}</h1>
            <p className="text-sm text-[#57606a] mt-0.5">
              Uploaded {new Date(report.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-full self-start sm:self-center">
            ✓ Analysis Complete
          </span>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <StatusBadge count={normalCount} status="normal" />
          <StatusBadge count={slightlyAbnormal} status="slightly_high" />
          <StatusBadge count={severeAbnormal} status="high" />
        </div>
      </div>

      {/* Clinical Summary */}
      {clinical_summary && (
        <div className="bg-[#f0f6ff] border border-blue-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-[#3b82d4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Clinical Summary
          </h2>
          <p className="text-sm text-[#1f2328] leading-relaxed">{clinical_summary.summary_text}</p>

          {clinical_summary.recommendation_text && (
            <>
              <h3 className="font-medium text-sm mt-3">Recommendations</h3>
              <p className="text-sm text-[#1f2328] leading-relaxed">{clinical_summary.recommendation_text}</p>
            </>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <strong>⚠️ Educational Disclaimer:</strong> This analysis is for educational purposes only and does not constitute a medical diagnosis. Please consult a qualified healthcare professional to discuss these results and determine appropriate follow-up.
      </div>

      {/* Parameters — Abnormal First */}
      {abnormalParams.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Abnormal Parameters ({abnormalParams.length})</h2>
          {abnormalParams.map((p) => (
            <ParameterCard key={p.id} param={p} />
          ))}
        </div>
      )}

      {/* Normal Parameters */}
      {normalParams.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Normal Parameters ({normalParams.length})</h2>
          {normalParams.map((p) => (
            <ParameterCard key={p.id} param={p} />
          ))}
        </div>
      )}

      {parameters.length === 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 text-center text-[#57606a] text-sm">
          No parameters were extracted from this report.
        </div>
      )}
    </div>
  );
}
