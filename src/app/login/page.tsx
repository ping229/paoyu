"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("intercode", data.data.intercode);
        localStorage.setItem("username", data.data.username);
        window.location.href = "/space";
      } else {
        setError(data.error || "登录失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-8 text-purple-400">
          登录异世界
        </h1>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="输入用户名"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="输入密码"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center mt-4">{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </div>

        <p className="text-center mt-6 text-gray-500 text-sm">
          没有账号？{" "}
          <Link href="/register" className="text-purple-400 hover:underline">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
