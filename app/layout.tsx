import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "Engineer's orchestration cockpit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* canon §1.4: the warm page wash is applied ONCE here on the app
          shell root as `bg-amber-50/30` over white — never per-page. */}
      <body className="min-h-full flex flex-col bg-white">
        <div className="flex min-h-screen flex-col bg-amber-50/30 text-stone-900">
          {children}
        </div>
      </body>
    </html>
  );
}
