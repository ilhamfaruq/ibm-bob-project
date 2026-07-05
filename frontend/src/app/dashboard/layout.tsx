"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/upload", label: "Upload Lab", icon: "↑" },
  { href: "/history", label: "History", icon: "⏱" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3b82d4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#3b82d4" />
              <path d="M16 7v18M10 13l6-6 6 6M10 19h12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-bold text-sm tracking-tight">LabInsight AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-[#f0f6ff] text-[#3b82d4] font-medium"
                    : "text-[#57606a] hover:bg-[#f7f8fa] hover:text-[#1f2328]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#57606a] hidden sm:block">{user.name}</span>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="text-sm text-[#57606a] hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-[#e5e7eb]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-2.5 text-xs transition-colors ${
                pathname === item.href
                  ? "text-[#3b82d4] font-medium border-b-2 border-[#3b82d4]"
                  : "text-[#57606a]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>

      <footer className="text-center text-xs text-[#57606a] py-4 border-t border-[#e5e7eb]">
        ⚠️ LabInsight AI bersifat edukatif saja — bukan pengganti penilaian dokter.
      </footer>
    </div>
  );
}
