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
  const privateChat = searchParams.get("privateChat");

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

    if (privateChat) {
      setTargetUserId(privateChat);
    }

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
        setSuccess("泡泡已发送，正在飘向对方...");
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

  const isPrivateChat = !!privateChat;
  const isReply = !!replyTo;
  const showTargetInput = !isReply && !isPrivateChat;
  const backUrl = isPrivateChat ? "/public" : "/space";

  return (
    <div className="min-h-[85vh] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
            {isPrivateChat ? "发送私聊泡泡" : isReply ? "回复泡泡" : "写一个泡泡"}
          </h1>
          <p className="text-gray-500">
            {isPrivateChat
              ? "向对方发送一条私密消息"
              : isReply
              ? "回复对方的泡泡"
              : "把你的心声装进泡泡"}
          </p>
          <Link href={backUrl} className="text-gray-400 hover:text-purple-400 text-sm mt-2 inline-block">
            ← {isPrivateChat ? "返回公共频道" : "返回个人空间"}
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/20 border border-green-700/50 text-green-400 px-4 py-3 rounded-lg mb-6 text-center">
            {success}
          </div>
        )}

        {/* Target Input */}
        {showTargetInput && (
          <div className="mb-8">
            <input
              type="text"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
              placeholder="输入对方的交互码..."
              maxLength={8}
              className="w-full px-6 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-100 text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Private Chat Hint */}
        {isPrivateChat && (
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/20 border border-blue-700/30 rounded-full text-blue-300 text-sm">
              💬 私聊模式 - 对方一定能收到
            </span>
          </div>
        )}

        {/* Reply Hint */}
        {isReply && (
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-700/30 rounded-full text-purple-300 text-sm">
              💜 回复模式 - 对方会收到你的消息
            </span>
          </div>
        )}

        {/* Draft Messages Preview */}
        {draftMessages.length > 0 && (
          <div className="mb-8 space-y-3">
            {draftMessages.map((msg, index) => (
              <div
                key={msg.id}
                className="group flex items-start gap-4 bg-gray-900/30 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <span className="text-purple-400 font-mono text-sm w-6">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  {msg.type === "text" && (
                    <p className="text-gray-200 whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  {msg.type === "image" && (
                    <img src={msg.content} alt="图片预览" className="max-w-full max-h-48 rounded-lg" />
                  )}
                </div>
                <button
                  onClick={() => removeDraftMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Area */}
        <div className="mb-8">
          <textarea
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addTextMessage();
              }
            }}
            placeholder="写下你想说的话...按回车添加"
            className="w-full px-6 py-5 bg-gray-900/30 border border-gray-800 rounded-xl text-gray-100 text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none min-h-[160px]"
            rows={6}
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-3">
              <label className="cursor-pointer px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm transition-colors">
                📷 图片
                <input type="file" accept="image/*" onChange={addImageMessage} className="hidden" />
              </label>
            </div>
            <button
              onClick={addTextMessage}
              disabled={!textMessage.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              添加文字
            </button>
          </div>
        </div>

        {/* Schedule - 私聊时隐藏 */}
        {!isPrivateChat && (
          <div className="mb-8 p-5 bg-gray-900/20 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">定时发送</span>
              {scheduledAt && (
                <button onClick={() => setScheduledAt("")} className="text-gray-500 hover:text-gray-300 text-sm">
                  清除
                </button>
              )}
            </div>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-purple-500"
            />

            {scheduledAt && new Date(scheduledAt) > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
              <label className="flex items-center gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600"
                />
                <span className="text-gray-400 text-sm">一个月后公开到公共频道</span>
              </label>
            )}
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={sendMessages}
          disabled={loading || draftMessages.length === 0}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white text-lg font-medium rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {loading ? "发送中..." : "发送泡泡"}
        </button>
      </div>
    </div>
  );
}
