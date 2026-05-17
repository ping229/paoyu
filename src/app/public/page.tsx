"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  type: string;
  content: string;
  order: number;
}

interface PublicMessage {
  id: string;
  type: 'messageSet' | 'timeMail';
  messages: Message[];
  createdAt: string;
  publicAt: string | null;
  likeCount: number;
  commentCount: number;
  senderName?: string;
  toEmail?: string;
  subject?: string;
  content?: string;
  scheduledAt?: string;
  status?: string;
  sentAt?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  replyToId: string | null;
  replyToContent: string | null;
  isOwner: boolean;
  isAIComment?: boolean;
  aiConfigId?: string;
}

interface ReadStatus {
  [key: string]: {
    hasRead: boolean;
    hasCommented: boolean;
  };
}

const READ_STATUS_KEY = 'bubble_read_status';

function loadReadStatusFromLocal(): ReadStatus {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(READ_STATUS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveReadStatusToLocal(status: ReadStatus) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(READ_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

export default function PublicPage() {
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const highlightId = searchParams?.get('highlight');

  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBubble, setSelectedBubble] = useState<PublicMessage | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [readStatus, setReadStatus] = useState<ReadStatus>({});

  useEffect(() => {
    fetchPublicMessages();
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    const localStatus = loadReadStatusFromLocal();
    setReadStatus(localStatus);
  }, []);

  const fetchPublicMessages = async () => {
    try {
      const res = await fetch("/api/public/list");
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);

        const token = localStorage.getItem("token");
        if (token && data.data.length > 0) {
          const ids = data.data.map((m: PublicMessage) => m.id).join(',');
          const statusRes = await fetch(`/api/bubble/read-status?ids=${ids}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const statusData = await statusRes.json();
          if (statusData.success) {
            const localStatus = loadReadStatusFromLocal();
            const serverStatus: ReadStatus = {};
            statusData.data.forEach((s: { messageSetId: string; hasRead: boolean; hasCommented: boolean }) => {
              serverStatus[s.messageSetId] = {
                hasRead: s.hasRead || localStatus[s.messageSetId]?.hasRead || false,
                hasCommented: s.hasCommented || localStatus[s.messageSetId]?.hasCommented || false
              };
            });
            setReadStatus(prev => ({ ...localStatus, ...serverStatus }));
          }
        }

        if (highlightId) {
          const highlightBubble = data.data.find((m: PublicMessage) => m.id === highlightId);
          if (highlightBubble) {
            setTimeout(() => openBubble(highlightBubble), 100);
          }
        }
      }
    } catch (error) {
      console.error("Fetch public messages error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openBubble = async (bubble: PublicMessage) => {
    setSelectedBubble(bubble);
    setLikeCount(bubble.likeCount);
    setComments([]);
    setLiked(false);
    setReplyTo(null);
    markAsRead(bubble.id);

    const token = localStorage.getItem("token");
    const commentsRes = await fetch(`/api/comment/list?messageSetId=${bubble.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const commentsData = await commentsRes.json();
    if (commentsData.success) {
      setComments(commentsData.data);
    }

    if (token) {
      const likeRes = await fetch(`/api/like/status?messageSetId=${bubble.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const likeData = await likeRes.json();
      if (likeData.success) {
        setLiked(likeData.data.liked);
        setLikeCount(likeData.data.likeCount);
      }
    }
  };

  const markAsRead = async (messageSetId: string) => {
    setReadStatus(prev => {
      const newStatus = {
        ...prev,
        [messageSetId]: {
          hasRead: true,
          hasCommented: prev[messageSetId]?.hasCommented || false
        }
      };
      saveReadStatusToLocal(newStatus);
      return newStatus;
    });

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/bubble/read-status", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ messageSetId })
        });
      } catch (error) {
        console.error("Mark read error:", error);
      }
    }
  };

  const markAsCommented = (messageSetId: string) => {
    setReadStatus(prev => {
      const newStatus = {
        ...prev,
        [messageSetId]: {
          hasRead: true,
          hasCommented: true
        }
      };
      saveReadStatusToLocal(newStatus);
      return newStatus;
    });
  };

  const handleLike = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("请先登录");
      return;
    }

    try {
      const res = await fetch("/api/like/toggle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messageSetId: selectedBubble?.id })
      });

      const data = await res.json();
      if (data.success) {
        setLiked(data.data.liked);
        setLikeCount(prev => data.data.liked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleComment = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("请先登录");
      return;
    }

    if (!commentText.trim()) return;

    try {
      const res = await fetch("/api/comment/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messageSetId: selectedBubble?.id,
          content: commentText.trim(),
          replyToId: replyTo?.id || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, {
          id: data.data.id,
          content: data.data.content,
          createdAt: data.data.createdAt,
          userId: "",
          replyToId: data.data.replyToId,
          replyToContent: replyTo?.content || null,
          isOwner: true
        }]);
        setCommentText("");
        setReplyTo(null);

        if (selectedBubble) {
          markAsCommented(selectedBubble.id);
        }
      }
    } catch (error) {
      console.error("Comment error:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/comment/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ commentId })
      });

      const data = await res.json();
      if (data.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error("Delete comment error:", error);
    }
  };

  const handlePrivateChat = (userId: string) => {
    router.push(`/send?privateChat=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
            公共频道
          </h1>
          <p className="text-gray-500">
            用户公开的时间胶囊，随机排列
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="text-gray-600 text-center py-20">
            <p className="text-5xl mb-4">💭</p>
            <p>暂无公开消息</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {messages.map((msg) => {
              const status = readStatus[msg.id] || { hasRead: false, hasCommented: false };
              const isUnread = !status.hasRead;
              const hasCommented = status.hasCommented;

              return (
                <button
                  key={msg.id}
                  onClick={() => openBubble(msg)}
                  className={`aspect-square rounded-full transition-all flex flex-col items-center justify-center text-white shadow-lg relative ${
                    msg.type === 'timeMail'
                      ? 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400'
                      : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400'
                  } ${
                    isUnread
                      ? 'opacity-100 shadow-2xl ring-2 ring-white/30 ring-offset-2 ring-offset-gray-950'
                      : 'opacity-50 hover:opacity-70'
                  } ${
                    highlightId === msg.id ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-gray-950" : ""
                  }`}
                >
                  {hasCommented && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                      ✓
                    </span>
                  )}

                  <span className="text-4xl">{msg.type === 'timeMail' ? '✉️' : '💬'}</span>
                  {msg.type === 'timeMail' && (
                    <span className="text-xs mt-1 opacity-80">时光邮件</span>
                  )}
                  <div className="absolute bottom-5 flex items-center gap-4 text-sm">
                    <span>❤️ {msg.likeCount}</span>
                    <span>💬 {msg.commentCount}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Bubble Detail Modal */}
        {selectedBubble && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full my-8 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-xl font-medium text-purple-400">
                  {selectedBubble.type === 'timeMail' ? '✉️ 时光邮件' : '💬 泡泡'}
                </h3>
                <button
                  onClick={() => setSelectedBubble(null)}
                  className="text-gray-500 hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Time Mail Info */}
                {selectedBubble.type === 'timeMail' && (
                  <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                    {selectedBubble.senderName && (
                      <p className="text-gray-400 text-sm">来自：{selectedBubble.senderName}</p>
                    )}
                    {selectedBubble.toEmail && (
                      <p className="text-gray-400 text-sm">收件人：{selectedBubble.toEmail}</p>
                    )}
                    {selectedBubble.subject && (
                      <p className="text-gray-100 text-lg font-medium mt-2">{selectedBubble.subject}</p>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-4">
                  {selectedBubble.messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-800/30 rounded-xl p-5">
                      {msg.type === "text" && (
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-lg">{msg.content}</p>
                      )}
                      {msg.type === "image" && (
                        <img src={msg.content} alt="图片" className="max-w-full rounded-lg" />
                      )}
                      {msg.type === "voice" && (
                        <audio src={msg.content} controls className="w-full" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Time Info */}
                <div className="mt-6 text-gray-600 text-sm">
                  {selectedBubble.type === 'timeMail' ? (
                    <>
                      <p>创建于：{new Date(selectedBubble.createdAt).toLocaleString("zh-CN")}</p>
                      {selectedBubble.scheduledAt && (
                        <p>预定发送：{new Date(selectedBubble.scheduledAt).toLocaleString("zh-CN")}</p>
                      )}
                      {selectedBubble.sentAt && (
                        <p>实际发送：{new Date(selectedBubble.sentAt).toLocaleString("zh-CN")}</p>
                      )}
                    </>
                  ) : (
                    selectedBubble.publicAt && (
                      <p>
                        公开于：{new Date(selectedBubble.publicAt).toLocaleDateString("zh-CN")}
                      </p>
                    )
                  )}
                </div>

                {/* Like Button */}
                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
                      liked
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                    }`}
                  >
                    <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
                    <span>{likeCount}</span>
                  </button>
                  <span className="text-gray-500">
                    💬 {comments.length} 条评论
                  </span>
                </div>

                {/* Comments Section */}
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <h4 className="text-gray-300 font-medium mb-4">评论</h4>

                  {/* Comment List */}
                  <div className="space-y-4 mb-6">
                    {comments.length === 0 ? (
                      <p className="text-gray-600 text-center py-4">暂无评论</p>
                    ) : (
                      comments.map((c) => (
                        <div
                          key={c.id}
                          className={`rounded-xl p-4 ${
                            c.isAIComment
                              ? 'bg-purple-900/20 border border-purple-700/30'
                              : 'bg-gray-800/30'
                          }`}
                        >
                          {c.isAIComment && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-purple-400 text-sm">🤖 AI 助手</span>
                            </div>
                          )}
                          {c.replyToContent && (
                            <div className="mb-2 pl-3 border-l-2 border-gray-700 text-gray-500 text-sm">
                              引用: {c.replyToContent.length > 50 ? c.replyToContent.slice(0, 50) + "..." : c.replyToContent}
                            </div>
                          )}
                          <p className="text-gray-200">{c.content}</p>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-gray-600 text-sm">
                              {new Date(c.createdAt).toLocaleString("zh-CN")}
                            </p>
                            <div className="flex items-center gap-3">
                              {isLoggedIn && (
                                <>
                                  <button
                                    onClick={() => setReplyTo(c)}
                                    className="text-purple-400 hover:text-purple-300 text-sm"
                                  >
                                    回复
                                  </button>
                                  {!c.isAIComment && c.userId && (
                                    <button
                                      onClick={() => handlePrivateChat(c.userId)}
                                      className="text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                      私聊
                                    </button>
                                  )}
                                </>
                              )}
                              {c.isOwner && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-red-400 hover:text-red-300 text-sm"
                                >
                                  删除
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Indicator */}
                  {replyTo && (
                    <div className="mb-4 px-4 py-3 bg-purple-900/20 border border-purple-700/30 rounded-xl flex items-center justify-between">
                      <span className="text-purple-300">
                        回复: {replyTo.content.length > 30 ? replyTo.content.slice(0, 30) + "..." : replyTo.content}
                      </span>
                      <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-200">
                        ×
                      </button>
                    </div>
                  )}

                  {/* Comment Input */}
                  {isLoggedIn ? (
                    <div className="space-y-3">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={replyTo ? "写下你的回复..." : "写下你的评论..."}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                        rows={3}
                      />
                      <button
                        onClick={handleComment}
                        disabled={!commentText.trim()}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
                      >
                        {replyTo ? "发送回复" : "发送评论"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4">登录后可以评论</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
