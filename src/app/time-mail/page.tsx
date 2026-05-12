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

  // 表单状态
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  // 列表状态
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
        setMessage("时光邮件已创建！将在指定时间发送。");
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

  // 获取最小日期时间（当前时间）
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // 至少30分钟后
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-[80vh] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-400">时光邮件</h1>
          <Link href="/" className="text-gray-400 hover:text-purple-400 text-sm">
            返回首页
          </Link>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-sm">
            给未来的某人写一封信。设定发送时间，我们将在指定时间将邮件发送给收件人。
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("send")}
            className={`pb-2 px-2 ${
              activeTab === "send"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            写信
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-2 px-2 ${
                activeTab === "list"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-gray-400"
              }`}
            >
              我的邮件
            </button>
          )}
        </div>

        {/* Send Tab */}
        {activeTab === "send" && (
          <div className="space-y-4">
            {/* 发送者信息 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">发送者名称（选填）</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="匿名者"
                maxLength={50}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">发送者邮箱（选填，用于回复）</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 收件人 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">收件人邮箱 *</label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@email.com"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 主题 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">邮件主题 *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="给未来的你"
                maxLength={100}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 内容 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">邮件内容 * (最多10000字)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你想说的话..."
                rows={10}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-gray-500 text-xs mt-1">{content.length} / 10000</p>
            </div>

            {/* 发送时间 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">发送时间 *</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={getMinDateTime()}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-purple-500"
              />
              <p className="text-gray-500 text-xs mt-1">最早30分钟后发送</p>
            </div>

            {/* 公开设置 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded text-purple-500"
                />
                <div>
                  <p className="text-gray-200">公开到公共频道</p>
                  <p className="text-gray-500 text-xs">
                    公开的邮件将在发送成功后或创建满一个月后显示在公共频道
                  </p>
                </div>
              </label>
            </div>

            {message && (
              <p className={message.includes("成功") ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                {message}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              {sending ? "创建中..." : "投递时光邮件"}
            </button>
          </div>
        )}

        {/* List Tab */}
        {activeTab === "list" && activeTab === "list" && (
          <div>
            {loading ? (
              <div className="text-gray-400 text-center py-12">加载中...</div>
            ) : timeMails.length === 0 ? (
              <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
                暂无时光邮件
              </div>
            ) : (
              <div className="space-y-4">
                {timeMails.map((mail) => (
                  <div
                    key={mail.id}
                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-gray-200 font-medium">{mail.subject}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          收件人: {mail.toEmail}
                        </p>
                        <p className="text-gray-500 text-sm">
                          发送时间: {new Date(mail.scheduledAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {mail.isSent ? (
                          <span className="text-green-400 text-sm">已发送</span>
                        ) : (
                          <>
                            <span className="text-yellow-400 text-sm">待发送</span>
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
