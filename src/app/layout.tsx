import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "泡语 - 异世界真心话",
  description: "异世界真心话 - 这里不是现实。没有名字，没有头像，没有过去。只有一个8位交互码，和一颗想说真话的心。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100 font-sans">
        <Nav />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
          <p className="mb-2">
            请守护彼此的匿名。不要把异世界的话，带到那边的世界去。
          </p>
          <p className="text-xs">
            泡语 - 异世界真心话 © 2024
          </p>
        </footer>
      </body>
    </html>
  );
}
