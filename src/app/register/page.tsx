"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    setError("");

    if (!username || username.length < 3) {
      setError("用户名至少需要3个字符");
      return;
    }

    if (!password || password.length < 6) {
      setError("密码至少需要6个字符");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (!agreed) {
      setError("请先同意异世界契约");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, agreedToContract: true }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        setError(data.error || "注册失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-purple-400 mb-2">注册成功！</h2>
          <p className="text-gray-400">正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-8">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-400">
          进入异世界
        </h1>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-20个字符"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6个字符"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
          <p className="text-gray-300 text-sm font-medium mb-3">异世界契约</p>
          <div className="text-gray-400 text-sm space-y-2">
            <p>我承诺：</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-500">
              <li>不试图通过内容推断对方现实身份</li>
              <li>不在任何线下场合提及"异世界"中的对话内容</li>
              <li>不主动透露或索取任何现实世界的联系方式</li>
              <li>若违反以上任意一条，我愿意接受永久封禁</li>
            </ol>
          </div>

          <label className="flex items-start gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-400 text-sm">
              我已阅读并同意异世界契约
            </span>
          </label>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {loading ? "注册中..." : "注册并进入异世界"}
        </button>

        <p className="text-center mt-6 text-gray-500 text-sm">
          已有账号？{" "}
          <Link href="/login" className="text-purple-400 hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
