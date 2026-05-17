"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Block {
  id: string;
  summary: string;
  createdAt: string;
  messageSetDeleted: boolean;
  messageSet: {
    id: string;
    messages: Array<{ type: string; content: string }>;
  } | null;
}

interface TravelerRecord {
  id: string;
  travelerId: string | null;
  title: string;
  description: string | null;
  isPublic: boolean;
  titleBanned: boolean;
  descBanned: boolean;
  intercode: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [intercode, setIntercode] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [destroyLoading, setDestroyLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // 旅人录相关状态
  const [travelerRecord, setTravelerRecord] = useState<TravelerRecord | null>(null);
  const [travelerTitle, setTravelerTitle] = useState("");
  const [travelerDesc, setTravelerDesc] = useState("");
  const [travelerPublic, setTravelerPublic] = useState(true);
  const [travelerLoading, setTravelerLoading] = useState(false);
  const [lastTravelerUpdate, setLastTravelerUpdate] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const code = localStorage.getItem("intercode");

    if (!token) {
      router.push("/login");
      return;
    }

    setIntercode(code || "");
    fetchBlocks(token);
    fetchTravelerRecord(token);
  }, [router]);

  const fetchBlocks = async (token: string) => {
    try {
      const res = await fetch("/api/block/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setBlocks(data.data);
      }
    } catch (error) {
      console.error("Fetch blocks error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTravelerRecord = async (token: string) => {
    try {
      const res = await fetch("/api/traveler/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setTravelerRecord(data.data);
        setTravelerTitle(data.data.title || "");
        setTravelerDesc(data.data.description || "");
        setTravelerPublic(data.data.isPublic);
      }
    } catch (error) {
      console.error("Fetch traveler record error:", error);
    }
  };

  const handleUpdateTraveler = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // 防止频繁提交（5秒冷却）
    const now = Date.now();
    if (now - lastTravelerUpdate < 5000) {
      setError("操作太频繁，请稍后再试");
      return;
    }

    setTravelerLoading(true);
    setError("");

    try {
      const res = await fetch("/api/traveler/my", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: travelerTitle,
          description: travelerDesc,
          isPublic: travelerPublic,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTravelerRecord(data.data);
        setLastTravelerUpdate(now);
        setMessage("旅人录已更新！");
      } else {
        setError(data.error || "更新失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setTravelerLoading(false);
    }
  };

  const handleRefreshCode = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setRefreshLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/refresh-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setIntercode(data.data.intercode);
        localStorage.setItem("intercode", data.data.intercode);
        setMessage("交互码已刷新！");
      } else {
        setError(data.error || "刷新失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleUnblock = async (blockId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/block/remove", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blockId }),
      });

      const data = await res.json();
      if (data.success) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
        setMessage(`已解除屏蔽，有 ${data.data.pendingCount} 条待接收消息`);
      }
    } catch {
      setError("操作失败");
    }
  };

  const handleDestroy = async () => {
    if (!confirm("确定要清空所有信息并注销账号吗？此操作不可撤销！")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setDestroyLoading(true);

    try {
      const res = await fetch("/api/user/destroy", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        localStorage.removeItem("token");
        localStorage.removeItem("intercode");
        router.push("/");
      } else {
        setError(data.error || "操作失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setDestroyLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("intercode");
    localStorage.removeItem("username");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-purple-400">设置</h1>
          <Link
            href="/space"
            className="text-gray-400 hover:text-purple-400 text-sm"
          >
            返回个人空间
          </Link>
        </div>

        {message && (
          <div className="bg-green-900/30 border border-green-700 text-green-400 px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Intercode Section */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-200 mb-4">我的交互码</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-purple-400 tracking-widest">
                {intercode}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                每24小时可刷新一次
              </p>
            </div>
            <button
              onClick={handleRefreshCode}
              disabled={refreshLoading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm"
            >
              {refreshLoading ? "刷新中..." : "刷新交互码"}
            </button>
          </div>
        </div>

        {/* Traveler Record Section */}
        {travelerRecord && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-200">我的旅人录</h2>
              <Link
                href="/gathering"
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                查看集会
              </Link>
            </div>

            <div className="space-y-4">
              {/* 旅人ID */}
              {travelerRecord.travelerId && (
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div>
                    <p className="text-gray-300 text-sm">旅人ID</p>
                    <p className="text-gray-500 text-xs">在集会中的唯一标识</p>
                  </div>
                  <p className="text-purple-400 font-mono text-lg">{travelerRecord.travelerId}</p>
                </div>
              )}

              {/* 称号 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  称号
                  {travelerRecord.titleBanned && (
                    <span className="text-red-400 ml-2">(已被封禁，请修改)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={travelerTitle}
                  onChange={(e) => setTravelerTitle(e.target.value)}
                  placeholder="输入称号..."
                  maxLength={20}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">{travelerTitle.length}/20 字（2-20字）</p>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  描述
                  {travelerRecord.descBanned && (
                    <span className="text-red-400 ml-2">(已被封禁，请修改)</span>
                  )}
                </label>
                <textarea
                  value={travelerDesc}
                  onChange={(e) => setTravelerDesc(e.target.value)}
                  placeholder="介绍一下自己吧..."
                  maxLength={200}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                />
                <p className="text-gray-500 text-xs mt-1">{travelerDesc.length}/200 字</p>
              </div>

              {/* 是否展示 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">在集会中展示</p>
                  <p className="text-gray-500 text-xs">关闭后其他用户将无法看到你的旅人录</p>
                </div>
                <button
                  onClick={() => setTravelerPublic(!travelerPublic)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    travelerPublic
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {travelerPublic ? '已开启' : '已关闭'}
                </button>
              </div>

              {/* 保存按钮 */}
              <button
                onClick={handleUpdateTraveler}
                disabled={travelerLoading}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm"
              >
                {travelerLoading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        )}

        {/* Block List */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-200 mb-4">
            屏蔽列表 ({blocks.length})
          </h2>
          {blocks.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无屏蔽用户</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                >
                  <div>
                    <p className="text-gray-300 text-sm">{block.summary}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      屏蔽于 {new Date(block.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(block.id)}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-400 mb-4">危险区域</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">自我摧毁</p>
              <p className="text-gray-500 text-xs mt-1">
                清空所有信息并注销账号，此操作不可撤销
              </p>
            </div>
            <button
              onClick={handleDestroy}
              disabled={destroyLoading}
              className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 disabled:bg-red-600/20 border border-red-700 text-red-400 rounded-lg text-sm"
            >
              {destroyLoading ? "注销中..." : "注销账号"}
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
