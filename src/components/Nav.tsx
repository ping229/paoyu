"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("username");
    setIsLoggedIn(!!token);
    setUsername(user || "");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("intercode");
    localStorage.removeItem("username");
    window.location.href = "/";
  };

  return (
    <header className="border-b border-gray-800 px-6 py-4">
      <nav className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-purple-400">
          泡语
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/public"
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm"
          >
            公共频道
          </Link>
          <Link
            href="/time-mail"
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm"
          >
            时光邮件
          </Link>
          <Link
            href="/about"
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm"
          >
            关于
          </Link>
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link
                href="/space"
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                {username}
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                退出
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-gray-400 hover:text-purple-400 transition-colors text-sm"
            >
              登录
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
