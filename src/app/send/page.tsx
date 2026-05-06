"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface DraftMessage {
  id: string;
  type: "text" | "image" | "voice";
  content: string;
}

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replyTo = searchParams.get("replyTo");
  const privateChat = searchParams.get("privateChat"); // 目标用户真码

  const [targetCode, setTargetCode] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [textMessage, setTextMessage] = useState("");
  const [draftMessages, setDraftMessages] = useState<DraftMessage[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // 如果是私聊，直接设置目标用户真码
    if (privateChat) {
      setTargetUserId(privateChat);
    }

    // 如果是回复泡泡，获取发送者的真码
    if (replyTo) {
      fetchSenderId(token, replyTo);
    }
  }, [router, replyTo, privateChat]);

  const fetchSenderId = async (token: string, messageSetId: string) => {
    try {
      const res = await fetch(`/api/messages/reply?messageSetId=${messageSetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setTargetUserId(data.data.senderId);
      } else {
        setError("无法获取回复目标");
      }
    } catch {
      setError("网络错误");
    }
  };

  const addTextMessage = () => {
    if (!textMessage.trim()) return;

    setDraftMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "text",
        content: textMessage.trim(),
      },
    ]);
    setTextMessage("");
  };

  const addImageMessage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setDraftMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: "image",
            content: data.data.url,
          },
        ]);
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("上传失败");
    }
  };

  const removeDraftMessage = (id: string) => {
    setDraftMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const sendMessages = async () => {
    if (draftMessages.length === 0) {
      setError("请至少添加一条消息");
      return;
    }

    // 如果不是回复也不是私聊，需要填写交互码
    if (!replyTo && !privateChat && !targetCode.trim() && !scheduledAt) {
      setError("请输入目标交互码");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetIntercode: targetCode.toUpperCase() || undefined,
          targetUserId: targetUserId || undefined,
          messages: draftMessages.map((m, i) => ({
            type: m.type,
            content: m.content,
            order: i,
          })),
          scheduledAt: scheduledAt || null,
          isPublic: isPublic && scheduledAt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("泡泡已发送！");
        setDraftMessages([]);
        setTargetCode("");
        setScheduledAt("");
        setIsPublic(false);
      } else {
        setError(data.error || "发送失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  // 判断页面类型
  const isPrivateChat = !!privateChat;
  const isReply = !!replyTo;
  const showTargetInput = !isReply && !isPrivateChat;

  // 返回链接
  const backUrl = isPrivateChat ? "/public" : "/space";

  return (
    <div className="min-h-[80vh] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-400">
            {isPrivateChat ? "发送私聊泡泡" : isReply ? "回复泡泡" : "发送新泡泡"}
          </h1>
          <Link
            href={backUrl}
            className="text-gray-400 hover:text-purple-400 text-sm"
          >
            {isPrivateChat ? "返回公共频道" : "返回个人空间"}
          </Link>
        </div>

        {/* 目标输入 - 回复或私聊时隐藏 */}
        {showTargetInput && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
            <label className="block text-gray-400 text-sm mb-2">目标交互码</label>
            <input
              type="text"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
              placeholder="8位交互码"
              maxLength={8}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        {/* 私聊提示 */}
        {isPrivateChat && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm">
              你正在发送私聊泡泡，对方会收到你的消息。即使对方刷新了交互码，也能收到。
            </p>
          </div>
        )}

        {/* 回复提示 */}
        {isReply && (
          <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4 mb-6">
            <p className="text-purple-300 text-sm">
              你正在回复一个泡泡，发送后对方会收到你的消息
            </p>
          </div>
        )}

        {/* Draft Messages */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
          <label className="block text-gray-400 text-sm mb-3">
            草稿消息 ({draftMessages.length})
          </label>
          <div className="max-h-64 overflow-y-auto pr-2">
            {draftMessages.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">暂无消息</p>
            ) : (
              <div className="space-y-3">
                {draftMessages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3"
                  >
                    <span className="text-gray-500 text-sm w-6 shrink-0">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      {msg.type === "text" && (
                        <p className="text-gray-300 text-sm break-words">
                          {msg.content}
                        </p>
                      )}
                      {msg.type === "image" && (
                        <img
                          src={msg.content}
                          alt="图片预览"
                          className="max-w-full max-h-32 rounded object-contain"
                        />
                      )}
                      {msg.type === "voice" && (
                        <audio src={msg.content} controls className="w-full max-w-xs" />
                      )}
                    </div>
                    <button
                      onClick={() => removeDraftMessage(msg.id)}
                      className="text-gray-500 hover:text-red-400 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Message */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
          <label className="block text-gray-400 text-sm mb-2">添加消息</label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTextMessage()}
              placeholder="输入文字消息..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={addTextMessage}
              disabled={!textMessage.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm"
            >
              添加
            </button>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={addImageMessage}
                className="hidden"
              />
              <div className="px-4 py-2 bg-gray-800 border border-gray-700 hover:border-purple-500 rounded-lg text-center text-gray-300 text-sm">
                📷 添加图片
              </div>
            </label>
          </div>
        </div>

        {/* Schedule - 私聊时隐藏 */}
        {!isPrivateChat && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
            <label className="block text-gray-400 text-sm mb-2">定时发送（可选）</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-purple-500"
            />

            {scheduledAt && new Date(scheduledAt) > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600"
                />
                <span className="text-gray-400 text-sm">
                  公开到公共频道（一个月后可见）
                </span>
              </label>
            )}
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}
        {success && (
          <div className="text-green-400 text-sm text-center mb-4">{success}</div>
        )}

        <button
          onClick={sendMessages}
          disabled={loading || draftMessages.length === 0}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {loading ? "发送中..." : "发送信息集"}
        </button>
      </div>
    </div>
  );
}
