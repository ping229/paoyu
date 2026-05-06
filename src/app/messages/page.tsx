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
}

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<MessageSet | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchMessages(token);
  }, [router]);

  const fetchMessages = async (token: string) => {
    try {
      const res = await fetch("/api/messages/list?type=received", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        const allMessages = [...(data.data.unread || []), ...(data.data.read || [])];
        setMessages(allMessages);
      }
    } catch (error) {
      console.error("Fetch messages error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMsg) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch("/api/messages/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageSetId: selectedMsg.id }),
      });

      setMessages((prev) => prev.filter((m) => m.id !== selectedMsg.id));
      setSelectedMsg(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleBlock = async () => {
    if (!selectedMsg) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/block/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageSetId: selectedMsg.id }),
      });

      const data = await res.json();
      if (data.success) {
        alert("已屏蔽该用户");
        setSelectedMsg(null);
      } else {
        alert(data.error || "屏蔽失败");
      }
    } catch (error) {
      console.error("Block error:", error);
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-400">收到的信息</h1>
          <Link
            href="/space"
            className="text-gray-400 hover:text-purple-400 text-sm"
          >
            返回个人空间
          </Link>
        </div>

        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            暂无消息
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedMsg(msg)}
                className="w-full text-left bg-gray-900/50 border border-gray-800 hover:border-purple-500/50 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm truncate">
                      {msg.messages[0]?.type === "text"
                        ? msg.messages[0].content.slice(0, 50)
                        : `[${msg.messages[0]?.type === "image" ? "图片" : "语音"}消息]`}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(msg.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      msg.isRead ? "bg-gray-600" : "bg-purple-500"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedMsg && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-purple-400">消息详情</h3>
                  <button
                    onClick={() => setSelectedMsg(null)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedMsg.messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-800/50 rounded-lg p-4">
                      {msg.type === "text" && (
                        <p className="text-gray-200">{msg.content}</p>
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
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"
                    >
                      删除
                    </button>
                    <Link
                      href={`/send?replyTo=${selectedMsg.id}`}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm text-center"
                    >
                      回复
                    </Link>
                  </div>
                  <button
                    onClick={handleBlock}
                    className="w-full py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-sm"
                  >
                    屏蔽发送者
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
