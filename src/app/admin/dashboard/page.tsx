"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Report {
  id: string;
  reportedId: string;
  reportedIntercode: string;
  reason: string | null;
  createdAt: string;
  messageSet: {
    messages: Array<{ type: string; content: string }>;
  };
}

interface Stats {
  activeUsers: number;
  totalMessageSets: number;
  pendingTasks: number;
  pendingReports: number;
  totalUsers: number;
}

interface AdminUserAccount {
  id: string;
  intercode: string;
  createdAt: string;
}

interface PublicMessage {
  id: string;
  createdAt: string;
  publicAt: string | null;
  messages: Array<{ type: string; content: string }>;
  commentCount: number;
  likeCount: number;
}

interface DraftMessage {
  id: string;
  type: "text" | "image";
  content: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);

  // 公共消息相关
  const [publicText, setPublicText] = useState("");
  const [draftMessages, setDraftMessages] = useState<DraftMessage[]>([]);
  const [sending, setSending] = useState(false);

  // 修改密码相关
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // 管理员用户账号
  const [adminUserAccount, setAdminUserAccount] = useState<AdminUserAccount | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  // 公共频道管理
  const [publicMessages, setPublicMessages] = useState<PublicMessage[]>([]);
  const [publicMessagesPage, setPublicMessagesPage] = useState(1);
  const [publicMessagesTotal, setPublicMessagesTotal] = useState(0);
  const [publicMessagesLoading, setPublicMessagesLoading] = useState(false);

  // 邮件配置
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
    sender_name: "泡语",
    sender_email: "",
  });
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [emailConfigMessage, setEmailConfigMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      const [statsRes, reportsRes, adminUserRes] = await Promise.all([
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/reports", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/create-user", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsData = await statsRes.json();
      const reportsData = await reportsRes.json();
      const adminUserData = await adminUserRes.json();

      if (statsData.success) setStats(statsData.data);
      if (reportsData.success) setReports(reportsData.data);
      if (adminUserData.success) setAdminUserAccount(adminUserData.data.userAccount);
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (reportId: string, status: "valid" | "invalid") => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reportId, status }),
      });

      const data = await res.json();
      if (data.success) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        if (stats) {
          setStats({ ...stats, pendingReports: stats.pendingReports - 1 });
        }
      }
    } catch (error) {
      console.error("Handle report error:", error);
    }
  };

  const handleBan = async (userId: string) => {
    if (!confirm("确定要封禁该用户吗？此操作将删除该用户的所有数据！")) {
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (data.success) {
        setReports((prev) => prev.filter((r) => r.reportedId !== userId));
        alert("用户已封禁");
      } else {
        alert(data.error || "封禁失败");
      }
    } catch (error) {
      console.error("Ban error:", error);
    }
  };

  const handleLookup = async () => {
    if (!lookupCode.trim()) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch("/api/admin/intercode-lookup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: lookupCode }),
      });

      const data = await res.json();
      if (data.success) {
        setLookupResult(data.data);
      }
    } catch (error) {
      console.error("Lookup error:", error);
    }
  };

  // 公共消息相关函数
  const addTextMessage = () => {
    if (!publicText.trim()) return;
    setDraftMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), type: "text", content: publicText.trim() },
    ]);
    setPublicText("");
  };

  const removeDraftMessage = (id: string) => {
    setDraftMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const addImageMessage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("adminToken");
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
          { id: Date.now().toString(), type: "image", content: data.data.url },
        ]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const sendPublicMessage = async () => {
    if (draftMessages.length === 0) {
      alert("请添加至少一条消息");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setSending(true);

    try {
      const res = await fetch("/api/admin/public-send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: draftMessages.map((m, i) => ({
            type: m.type,
            content: m.content,
            order: i,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("消息已发送到公共频道！");
        setDraftMessages([]);
      } else {
        alert(data.error || "发送失败");
      }
    } catch (error) {
      console.error("Send error:", error);
      alert("发送失败");
    } finally {
      setSending(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    setPasswordMessage("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("两次输入的新密码不一致");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("新密码至少需要6个字符");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordMessage("密码修改成功！");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage(data.error || "修改失败");
      }
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordMessage("修改失败");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateUserAccount = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setCreatingUser(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (data.success) {
        setAdminUserAccount({
          id: data.data.userId,
          intercode: data.data.intercode,
          createdAt: new Date().toISOString(),
        });
        alert("用户账号已创建/已存在！");
      } else {
        alert(data.error || "创建失败");
      }
    } catch (error) {
      console.error("Create user account error:", error);
      alert("创建失败");
    } finally {
      setCreatingUser(false);
    }
  };

  const fetchPublicMessages = async (page: number = 1) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setPublicMessagesLoading(true);

    try {
      const res = await fetch(`/api/admin/public-messages?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setPublicMessages(data.data.messages);
        setPublicMessagesPage(data.data.page);
        setPublicMessagesTotal(data.data.total);
      }
    } catch (error) {
      console.error("Fetch public messages error:", error);
    } finally {
      setPublicMessagesLoading(false);
    }
  };

  const handleDeletePublicMessage = async (messageSetId: string) => {
    if (!confirm("确定要删除这条公共消息吗？相关的评论和点赞也会被删除！")) {
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/public-messages?id=${messageSetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setPublicMessages((prev) => prev.filter((m) => m.id !== messageSetId));
        setPublicMessagesTotal((prev) => prev - 1);
        alert("删除成功");
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("Delete public message error:", error);
      alert("删除失败");
    }
  };

  const fetchEmailConfig = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch("/api/admin/email-config", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setEmailConfig({
          smtp_host: data.data.smtp_host || "",
          smtp_port: data.data.smtp_port || "",
          smtp_user: data.data.smtp_user || "",
          smtp_pass: data.data.smtp_pass || "",
          sender_name: data.data.sender_name || "泡语",
          sender_email: data.data.sender_email || "",
        });
      }
    } catch (error) {
      console.error("Fetch email config error:", error);
    }
  };

  const handleSaveEmailConfig = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setEmailConfigLoading(true);
    setEmailConfigMessage("");

    try {
      const res = await fetch("/api/admin/email-config", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailConfig),
      });

      const data = await res.json();
      if (data.success) {
        setEmailConfigMessage("配置已保存");
      } else {
        setEmailConfigMessage(data.error || "保存失败");
      }
    } catch (error) {
      console.error("Save email config error:", error);
      setEmailConfigMessage("保存失败");
    } finally {
      setEmailConfigLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/admin/login");
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-purple-400">管理员后台</h1>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-200 text-sm"
          >
            退出登录
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">活跃用户（7天）</p>
              <p className="text-2xl font-bold text-purple-400">{stats.activeUsers}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">总用户数</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalUsers}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">信息集总量</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalMessageSets}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">待处理举报</p>
              <p className="text-2xl font-bold text-red-400">{stats.pendingReports}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">定时任务</p>
              <p className="text-2xl font-bold text-purple-400">{stats.pendingTasks}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("reports")}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "reports"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            举报管理
          </button>
          <button
            onClick={() => setActiveTab("public")}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "public"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            发送公共消息
          </button>
          <button
            onClick={() => setActiveTab("lookup")}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "lookup"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            交互码查询
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "password"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            修改密码
          </button>
          <button
            onClick={() => setActiveTab("user")}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "user"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            用户功能
          </button>
          <button
            onClick={() => {
              setActiveTab("publicManage");
              fetchPublicMessages(1);
            }}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "publicManage"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            公共频道管理
          </button>
          <button
            onClick={() => {
              setActiveTab("emailConfig");
              fetchEmailConfig();
            }}
            className={`pb-2 px-2 whitespace-nowrap ${
              activeTab === "emailConfig"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400"
            }`}
          >
            邮件配置
          </button>
        </div>

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div>
            {reports.length === 0 ? (
              <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
                暂无待处理举报
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-gray-300 text-sm">
                          被举报交互码: <span className="text-purple-400">{report.reportedIntercode}</span>
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          举报时间: {new Date(report.createdAt).toLocaleString("zh-CN")}
                        </p>
                        {report.reason && (
                          <p className="text-gray-400 text-sm mt-2">
                            举报原因: {report.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReport(report.id, "valid")}
                          className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-sm"
                        >
                          有效
                        </button>
                        <button
                          onClick={() => handleReport(report.id, "invalid")}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm"
                        >
                          无效
                        </button>
                        <button
                          onClick={() => handleBan(report.reportedId)}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm"
                        >
                          封禁
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-2">举报内容:</p>
                      {report.messageSet.messages.map((msg, i) => (
                        <div key={i} className="text-gray-300 text-sm">
                          {msg.type === "text" && msg.content}
                          {msg.type === "image" && "[图片消息]"}
                          {msg.type === "voice" && "[语音消息]"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Public Message Tab */}
        {activeTab === "public" && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-200 mb-4">发送消息到公共频道</h2>
            <p className="text-gray-400 text-sm mb-4">
              发送的消息将立即显示在公共频道，所有用户可见
            </p>

            {/* Draft Messages */}
            {draftMessages.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">待发送消息 ({draftMessages.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {draftMessages.map((msg, index) => (
                    <div key={msg.id} className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3">
                      <span className="text-gray-500 text-sm">{index + 1}.</span>
                      <div className="flex-1">
                        {msg.type === "text" && (
                          <p className="text-gray-300 text-sm">{msg.content}</p>
                        )}
                        {msg.type === "image" && (
                          <img src={msg.content} alt="预览" className="max-h-24 rounded" />
                        )}
                      </div>
                      <button
                        onClick={() => removeDraftMessage(msg.id)}
                        className="text-gray-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Message */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publicText}
                  onChange={(e) => setPublicText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTextMessage()}
                  placeholder="输入文字消息..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={addTextMessage}
                  disabled={!publicText.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm"
                >
                  添加
                </button>
              </div>

              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={addImageMessage}
                    className="hidden"
                  />
                  <span className="inline-block px-4 py-2 bg-gray-800 border border-gray-700 hover:border-purple-500 rounded-lg text-gray-300 text-sm cursor-pointer">
                    📷 添加图片
                  </span>
                </label>
              </div>

              <button
                onClick={sendPublicMessage}
                disabled={sending || draftMessages.length === 0}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                {sending ? "发送中..." : "发送到公共频道"}
              </button>
            </div>
          </div>
        )}

        {/* Lookup Tab */}
        {activeTab === "lookup" && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                placeholder="输入交互码或真码"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleLookup}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                查询
              </button>
            </div>

            {lookupResult === null && (
              <p className="text-gray-500 text-sm">未找到用户</p>
            )}

            {lookupResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">真码</p>
                    <p className="text-gray-200 text-xs font-mono break-all">{lookupResult.userId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">当前交互码</p>
                    <p className="text-purple-400 font-bold">{lookupResult.intercode}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">注册时间</p>
                    <p className="text-gray-200">{new Date(lookupResult.createdAt).toLocaleString("zh-CN")}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">状态</p>
                    <p className={lookupResult.isBanned ? "text-red-400" : "text-green-400"}>
                      {lookupResult.isBanned ? "已封禁" : "正常"}
                    </p>
                  </div>
                </div>

                {lookupResult.history.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">交互码变更历史</p>
                    <div className="space-y-2">
                      {lookupResult.history.map((h: any) => (
                        <div key={h.id} className="bg-gray-800/50 rounded p-2 text-xs">
                          <span className="text-gray-500">{new Date(h.changedAt).toLocaleString("zh-CN")}</span>
                          <span className="mx-2 text-gray-600">→</span>
                          <span className="text-gray-400">{h.oldCode}</span>
                          <span className="mx-2 text-purple-400">→</span>
                          <span className="text-purple-400">{h.newCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-medium text-gray-200 mb-4">修改管理员密码</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">旧密码</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="输入旧密码"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少6个字符）"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {passwordMessage && (
                <p className={passwordMessage.includes("成功") ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                  {passwordMessage}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                {passwordLoading ? "修改中..." : "修改密码"}
              </button>
            </div>
          </div>
        )}

        {/* User Features Tab */}
        {activeTab === "user" && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-200 mb-4">管理员用户账号</h2>
              <p className="text-gray-400 text-sm mb-4">
                管理员账号也可以像普通用户一样发送和接收泡泡。使用相同的用户名和密码登录用户端。
              </p>

              {adminUserAccount ? (
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">用户ID（真码）</p>
                        <p className="text-gray-200 text-xs font-mono break-all">{adminUserAccount.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">交互码</p>
                        <p className="text-purple-400 font-bold text-lg">{adminUserAccount.intercode}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href="/space"
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-center transition-colors"
                    >
                      进入个人空间
                    </Link>
                    <Link
                      href="/send"
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-center transition-colors"
                    >
                      发送泡泡
                    </Link>
                    <Link
                      href="/public"
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-center transition-colors"
                    >
                      公共频道
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">尚未创建用户账号</p>
                  <button
                    onClick={handleCreateUserAccount}
                    disabled={creatingUser}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {creatingUser ? "创建中..." : "创建用户账号"}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-500 text-sm">
                💡 提示：管理员登录用户端时，使用相同的管理员用户名和密码。
              </p>
            </div>
          </div>
        )}

        {/* Public Channel Management Tab */}
        {activeTab === "publicManage" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-200">公共频道消息管理</h2>
              <p className="text-gray-400 text-sm">共 {publicMessagesTotal} 条消息</p>
            </div>

            {publicMessagesLoading ? (
              <div className="text-gray-400 text-center py-12">加载中...</div>
            ) : publicMessages.length === 0 ? (
              <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
                暂无公开消息
              </div>
            ) : (
              <div className="space-y-4">
                {publicMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-gray-500 text-xs">
                          公开时间: {msg.publicAt ? new Date(msg.publicAt).toLocaleString("zh-CN") : "未知"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          创建时间: {new Date(msg.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>❤️ {msg.likeCount}</span>
                        <span>💬 {msg.commentCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {msg.messages.map((m, i) => (
                        <div key={i} className="bg-gray-800/50 rounded p-3">
                          {m.type === "text" && (
                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{m.content}</p>
                          )}
                          {m.type === "image" && (
                            <p className="text-gray-400 text-sm">[图片消息]</p>
                          )}
                          {m.type === "voice" && (
                            <p className="text-gray-400 text-sm">[语音消息]</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/public?highlight=${msg.id}`}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-sm"
                        target="_blank"
                      >
                        在公共频道查看
                      </Link>
                      <button
                        onClick={() => handleDeletePublicMessage(msg.id)}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {publicMessagesTotal > 10 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => fetchPublicMessages(publicMessagesPage - 1)}
                      disabled={publicMessagesPage <= 1}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-300 rounded text-sm"
                    >
                      上一页
                    </button>
                    <span className="px-4 py-2 text-gray-400 text-sm">
                      第 {publicMessagesPage} 页 / 共 {Math.ceil(publicMessagesTotal / 10)} 页
                    </span>
                    <button
                      onClick={() => fetchPublicMessages(publicMessagesPage + 1)}
                      disabled={publicMessagesPage >= Math.ceil(publicMessagesTotal / 10)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-300 rounded text-sm"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Email Config Tab */}
        {activeTab === "emailConfig" && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-medium text-gray-200 mb-4">邮件服务配置</h2>
            <p className="text-gray-400 text-sm mb-6">
              配置SMTP邮件服务，用于发送时光邮件。推荐使用阿里云邮件、腾讯企业邮箱或Resend等服务。
            </p>

            <div className="space-y-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">SMTP服务器地址</label>
                <input
                  type="text"
                  value={emailConfig.smtp_host}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                  placeholder="smtp.example.com"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">SMTP端口</label>
                <input
                  type="text"
                  value={emailConfig.smtp_port}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                  placeholder="465"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">SMTP用户名</label>
                <input
                  type="text"
                  value={emailConfig.smtp_user}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">SMTP密码/授权码</label>
                <input
                  type="password"
                  value={emailConfig.smtp_pass}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">发件人名称</label>
                <input
                  type="text"
                  value={emailConfig.sender_name}
                  onChange={(e) => setEmailConfig({ ...emailConfig, sender_name: e.target.value })}
                  placeholder="泡语"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">发件人邮箱</label>
                <input
                  type="email"
                  value={emailConfig.sender_email}
                  onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value })}
                  placeholder="noreply@yourdomain.com"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">这是收件人看到的发件人地址</p>
              </div>

              {emailConfigMessage && (
                <p className={emailConfigMessage.includes("已保存") ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                  {emailConfigMessage}
                </p>
              )}

              <button
                onClick={handleSaveEmailConfig}
                disabled={emailConfigLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                {emailConfigLoading ? "保存中..." : "保存配置"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link href="/" className="text-gray-400 hover:text-purple-400 text-sm">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
