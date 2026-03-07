import ChatWidget from "@/components/ChatWidget";
import Header from "@/components/Header";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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
  title: "X-Tech - Học tập trực tuyến",
  description: "Website học tập trực tuyến X-Tech - Khóa học, bài tập, cộng đồng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}>
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
            <footer className="border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="px-4 text-center text-sm text-zinc-500 dark:text-zinc-400 sm:px-6 lg:px-8">
                © {new Date().getFullYear()} X-Tech. Học tập trực tuyến.
              </div>
            </footer>
            <ChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
