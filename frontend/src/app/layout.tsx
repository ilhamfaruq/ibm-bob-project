import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LabInsight AI — Clinical Blood Report Assistant",
  description:
    "Upload your blood lab results and get patient-friendly AI-powered interpretations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} antialiased bg-[#f7f8fa] text-[#1f2328]`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
