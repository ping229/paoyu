"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TimeMail {
  id: string;
  senderName: string;
  toEmail: string;
  subject: string;
  scheduledAt: string;
  isSent: boolean;
  createdAt: string;
}

export default function TimeMailPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "list">("send");

  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const [timeMails, setTimeMails] = useState<TimeMail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    if (token) {
      fetchTimeMails(token);
    }
  }, []);

  const fetchTimeMails = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-mail/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTimeMails(data.data);
      }
    } catch (error) {
      console.error("Fetch time mails error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!toEmail || !subject || !content || !scheduledAt) {
      setMessage("请填写完整信息");
      return;
    }

    setSending(true);
    setMessage("");

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/time-mail/create", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderName: senderName || "匿名者",
          senderEmail: senderEmail || null,
          toEmail,
          subject,
          content,
          scheduledAt,
          isPublic,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("时光邮件已投递，将在指定时间发送");
        setToEmail("");
        setSubject("");
        setContent("");
        setScheduledAt("");
        if (token) {
          fetchTimeMails(token);
        }
      } else {
        setMessage(data.error || "发送失败");
      }
    } catch (error) {
      console.error("Send time mail error:", error);
      setMessage("发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这封时光邮件吗？")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/time-mail/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) {
        setTimeMails((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Delete time mail error:", error);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-[85vh] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-3">
            时光邮件
          </h1>
          <p className="text-gray-500">
            给未来的某人写一封信，在指定时间送达
          </p>
          <Link href="/" className="text-gray-400 hover:text-blue-400 text-sm mt-2 inline-block">
            ← 返回首页
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-8 mb-10">
          <button
            onClick={() => setActiveTab("send")}
            className={`pb-2 text-lg transition-colors ${
              activeTab === "send"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            写信
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-2 text-lg transition-colors ${
                activeTab === "list"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              我的邮件
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-center ${
            message.includes("已投递")
              ? "bg-green-900/20 border border-green-700/50 text-green-400"
              : "bg-red-900/20 border border-red-700/50 text-red-400"
          }`}>
            {message}
          </div>
        )}

        {/* Send Tab */}
        {activeTab === "send" && (
          <div className="space-y-6">
            {/* 收件人 */}
            <div>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="收件人邮箱"
                className="w-full px-6 py-4 bg-gray-900/30 border border-gray-800 rounded-xl text-gray-100 text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 主题 */}
            <div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="邮件主题"
                maxLength={100}
                className="w-full px-6 py-4 bg-gray-900/30 border border-gray-800 rounded-xl text-gray-100 text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 内容 */}
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你想说的话..."
                className="w-full px-6 py-5 bg-gray-900/30 border border-gray-800 rounded-xl text-gray-100 text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[280px]"
              />
              <p className="text-gray-600 text-sm mt-2 text-right">{content.length} / 10000</p>
            </div>

            {/* 发送时间 */}
            <div className="p-5 bg-gray-900/20 border border-gray-800 rounded-xl">
              <p className="text-gray-400 mb-3">发送时间</p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={getMinDateTime()}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
              />
              <p className="text-gray-600 text-sm mt-2">最早30分钟后发送</p>
            </div>

            {/* 可选信息 */}
            <details className="group">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-300 text-sm py-2">
                更多选项（发送者信息）
              </summary>
              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="发送者名称（可选，默认匿名者）"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-gray-900/30 border border-gray-800 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="发送者邮箱（可选，用于回复）"
                  className="w-full px-4 py-3 bg-gray-900/30 border border-gray-800 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </details>

            {/* 公开设置 */}
            <label className="flex items-center gap-4 cursor-pointer p-4 bg-gray-900/20 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600"
              />
              <div>
                <p className="text-gray-300">公开到公共频道</p>
                <p className="text-gray-600 text-sm">发送成功后或创建满一个月后显示</p>
              </div>
            </label>

            {/* 发送按钮 */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-700 text-white text-lg font-medium rounded-xl transition-all disabled:cursor-not-allowed"
            >
              {sending ? "投递中..." : "投递时光邮件"}
            </button>
          </div>
        )}

        {/* List Tab */}
        {activeTab === "list" && (
          <div>
            {loading ? (
              <div className="text-gray-500 text-center py-16">加载中...</div>
            ) : timeMails.length === 0 ? (
              <div className="text-gray-600 text-center py-16">
                <p className="text-4xl mb-4">📭</p>
                <p>暂无时光邮件</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeMails.map((mail) => (
                  <div
                    key={mail.id}
                    className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-100 text-lg font-medium truncate">{mail.subject}</p>
                        <p className="text-gray-500 mt-2">
                          收件人：{mail.toEmail}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          发送时间：{new Date(mail.scheduledAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {mail.isSent ? (
                          <span className="px-3 py-1 bg-green-900/30 text-green-400 text-sm rounded-full">
                            已发送
                          </span>
                        ) : (
                          <>
                            <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded-full">
                              待发送
                            </span>
                            <button
                              onClick={() => handleDelete(mail.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              删除
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
