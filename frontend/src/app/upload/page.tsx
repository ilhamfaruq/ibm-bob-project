"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { reportsApi } from "@/lib/api";
import axios from "axios";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await reportsApi.upload(file);
      router.push(`/reports/${res.data.id}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Upload failed. Please try again.");
      } else {
        setError("Unexpected error occurred.");
      }
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Upload Lab Result</h1>
        <p className="text-sm text-[#57606a] mt-1">
          Upload your blood lab report (PDF or image). Our AI will extract parameters and provide educational interpretations.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-[#3b82d4] bg-blue-50"
            : file
            ? "border-green-400 bg-green-50"
            : "border-[#e5e7eb] hover:border-[#3b82d4] hover:bg-[#f0f6ff]"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {file ? (
            <>
              <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-[#1f2328]">{file.name}</p>
                <p className="text-sm text-[#57606a]">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-xs text-red-600 hover:underline"
              >
                Remove file
              </button>
            </>
          ) : (
            <>
              <svg className="w-12 h-12 text-[#57606a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className="font-medium text-[#1f2328]">
                  {isDragActive ? "Drop your file here" : "Drag & drop your lab report"}
                </p>
                <p className="text-sm text-[#57606a] mt-1">or click to browse</p>
              </div>
              <p className="text-xs text-[#57606a]">Supported: PDF, JPG, PNG, WebP — max 20 MB</p>
            </>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-3 bg-[#3b82d4] text-white text-sm font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading &amp; processing…
          </span>
        ) : (
          "Upload and Analyze"
        )}
      </button>

      {/* Info Box */}
      <div className="bg-[#f7f8fa] border border-[#e5e7eb] rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium">What happens after upload?</p>
        <ol className="text-sm text-[#57606a] list-decimal list-inside space-y-1">
          <li>AI reads and extracts lab parameters from your file</li>
          <li>Each value is compared against clinical reference ranges</li>
          <li>The AI agent writes educational explanations for each parameter</li>
          <li>A patient-friendly summary is generated</li>
        </ol>
      </div>

      <p className="text-xs text-[#57606a] text-center">
        ⚠️ Results are educational only and not a substitute for medical advice. Always consult your doctor.
      </p>
    </div>
  );
}
