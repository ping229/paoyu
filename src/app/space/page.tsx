"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  type: string;
  content: string;
  order: number;
}

interface MessageSet {
  id: string;
  isRead: boolean;
  createdAt: string;
  messages: Message[];
  isCommentReply?: boolean;
  commentMessageSetId?: string;
}

export default function SpacePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [intercode, setIntercode] = useState("");
  const [unreadMessages, setUnreadMessages] = useState<MessageSet[]>([]);
  const [readMessages, setReadMessages] = useState<MessageSet[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<MessageSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const code = localStorage.getItem("intercode");
    const user = localStorage.getItem("username");

    if (!token) {
      router.push("/login");
      return;
    }

    setUsername(user || "");
    setIntercode(code || "");
    fetchMessages(token);
  }, [router]);

  const fetchMessages = async (token: string) => {
    try {
      const res = await fetch("/api/messages/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setUnreadMessages(data.data.unread || []);
        setReadMessages(data.data.read || []);
      }
    } catch (error) {
      console.error("Fetch messages error:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageSetId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageSetId }),
      });

      setUnreadMessages((prev) => prev.filter((m) => m.id !== messageSetId));
      const msg = unreadMessages.find((m) => m.id === messageSetId);
      if (msg) {
        setReadMessages((prev) => [{ ...msg, isRead: true }, ...prev]);
      }
    } catch (error) {
      console.error("Mark read error:", error);
    }
  };

  const handleBubbleClick = (bubble: MessageSet) => {
    setSelectedBubble(bubble);
    if (!bubble.isRead) {
      markAsRead(bubble.id);
    }
  };

  const handleDelete = async () => {
    if (!selectedBubble) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch("/api/messages/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageSetId: selectedBubble.id }),
      });

      setUnreadMessages((prev) => prev.filter((m) => m.id !== selectedBubble.id));
      setReadMessages((prev) => prev.filter((m) => m.id !== selectedBubble.id));
      setSelectedBubble(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleBlock = async () => {
    if (!selectedBubble) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/block/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageSetId: selectedBubble.id }),
      });

      const data = await res.json();
      if (data.success) {
        alert("已屏蔽该用户");
        setSelectedBubble(null);
      } else {
        alert(data.error || "屏蔽失败");
      }
    } catch (error) {
      console.error("Block error:", error);
    }
  };

  const handleViewOriginal = () => {
    if (!selectedBubble?.commentMessageSetId) return;
    router.push(`/public?highlight=${selectedBubble.commentMessageSetId}`);
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
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">欢迎回来，<span className="text-purple-400">{username}</span></p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">你的交互码：</p>
              <p className="text-xl font-bold text-purple-400 tracking-widest">
                {intercode}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/send"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
            >
              发送泡泡
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 border border-gray-700 hover:border-purple-500 text-gray-300 rounded-lg text-sm"
            >
              设置
            </Link>
          </div>
        </div>
      </div>

      {/* Unread Bubbles */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-lg font-medium text-gray-300 mb-4">
          新泡泡 ({unreadMessages.length})
        </h2>
        {unreadMessages.length === 0 ? (
          <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            暂无新泡泡
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {unreadMessages.slice(0, 20).map((bubble) => (
              <button
                key={bubble.id}
                onClick={() => handleBubbleClick(bubble)}
                className={`aspect-square rounded-full opacity-90 hover:opacity-100 transition-opacity animate-pulse flex items-center justify-center text-white shadow-lg ${
                  bubble.isCommentReply
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/30"
                    : "bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/30"
                }`}
              >
                <span className="text-2xl">{bubble.isCommentReply ? "💬" : "💬"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Read Messages Link */}
      {readMessages.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <Link
            href="/messages"
            className="text-gray-400 hover:text-purple-400 text-sm"
          >
            查看已读消息 ({readMessages.length}) →
          </Link>
        </div>
      )}

      {/* Bubble Detail Modal */}
      {selectedBubble && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-medium ${selectedBubble.isCommentReply ? "text-blue-400" : "text-purple-400"}`}>
                  {selectedBubble.isCommentReply ? "评论回复通知" : "泡泡内容"}
                </h3>
                <button
                  onClick={() => setSelectedBubble(null)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedBubble.messages.map((msg) => (
                  <div key={msg.id} className="bg-gray-800/50 rounded-lg p-4">
                    {msg.type === "text" && (
                      <p className="text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.type === "image" && (
                      <img
                        src={msg.content}
                        alt="图片"
                        className="max-w-full rounded"
                      />
                    )}
                    {msg.type === "voice" && (
                      <audio src={msg.content} controls className="w-full" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {/* 查看原信息按钮 - 仅评论回复通知显示 */}
                {selectedBubble.isCommentReply && selectedBubble.commentMessageSetId && (
                  <button
                    onClick={handleViewOriginal}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    查看原信息
                  </button>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"
                  >
                    删除泡泡
                  </button>
                  {!selectedBubble.isCommentReply && (
                    <Link
                      href={`/send?replyTo=${selectedBubble.id}`}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm text-center"
                    >
                      回一个泡泡
                    </Link>
                  )}
                </div>
                {!selectedBubble.isCommentReply && (
                  <button
                    onClick={handleBlock}
                    className="w-full py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-sm"
                  >
                    屏蔽发送者
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
