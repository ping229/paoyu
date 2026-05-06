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
  messages: Message[];
  createdAt: string;
  publicAt: string | null;
  likeCount: number;
  commentCount: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  replyToId: string | null;
  replyToContent: string | null;
  isOwner: boolean;
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

  useEffect(() => {
    fetchPublicMessages();
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const fetchPublicMessages = async () => {
    try {
      const res = await fetch("/api/public/list");
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);

        // 如果有高亮ID，自动打开对应的泡泡
        if (highlightId) {
          const highlightBubble = data.data.find((m: PublicMessage) => m.id === highlightId);
          if (highlightBubble) {
            setTimeout(() => {
              openBubble(highlightBubble);
            }, 100);
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

    // 获取评论
    const token = localStorage.getItem("token");
    const commentsRes = await fetch(`/api/comment/list?messageSetId=${bubble.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const commentsData = await commentsRes.json();
    if (commentsData.success) {
      setComments(commentsData.data);
    }

    // 获取点赞状态
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
    // 跳转到发送泡泡页面，传递目标用户真码
    router.push(`/send?privateChat=${userId}`);
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
        <h1 className="text-2xl font-bold text-purple-400 mb-2">公共频道</h1>
        <p className="text-gray-500 text-sm mb-8">
          这里展示的是用户选择公开的时间胶囊，随机排序
        </p>

        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            暂无公开消息
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => openBubble(msg)}
                className={`aspect-square rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 opacity-90 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 relative ${
                  highlightId === msg.id ? "ring-4 ring-blue-400 ring-offset-2 ring-offset-gray-950" : ""
                }`}
              >
                <span className="text-3xl">💬</span>
                <div className="absolute bottom-4 flex items-center gap-3 text-xs">
                  <span>❤️ {msg.likeCount}</span>
                  <span>💬 {msg.commentCount}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Bubble Detail Modal */}
        {selectedBubble && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-lg w-full my-8">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-purple-400">泡泡内容</h3>
                  <button
                    onClick={() => setSelectedBubble(null)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {/* Messages */}
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {selectedBubble.messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-800/50 rounded-lg p-4">
                      {msg.type === "text" && (
                        <p className="text-gray-200 leading-relaxed">{msg.content}</p>
                      )}
                      {msg.type === "image" && (
                        <img src={msg.content} alt="图片" className="max-w-full rounded" />
                      )}
                      {msg.type === "voice" && (
                        <audio src={msg.content} controls className="w-full" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Time info */}
                <div className="mt-4 pt-4 border-t border-gray-800 text-gray-500 text-xs">
                  {selectedBubble.publicAt && (
                    <p>
                      创建于：{new Date(selectedBubble.createdAt).toLocaleDateString("zh-CN")} |
                      公开于：{new Date(selectedBubble.publicAt).toLocaleDateString("zh-CN")}
                    </p>
                  )}
                </div>

                {/* Like and Comment */}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      liked
                        ? "bg-red-600/30 text-red-400"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <span>{liked ? "❤️" : "🤍"}</span>
                    <span>{likeCount}</span>
                  </button>
                  <span className="text-gray-400 text-sm">
                    💬 {comments.length} 条评论
                  </span>
                </div>

                {/* Comments */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <h4 className="text-gray-300 text-sm font-medium mb-3">评论</h4>

                  {/* Comment list */}
                  <div className="max-h-60 overflow-y-auto mb-3">
                    {comments.length === 0 ? (
                      <p className="text-gray-500 text-sm">暂无评论</p>
                    ) : (
                      <div className="space-y-2">
                        {comments.map((c) => (
                          <div key={c.id} className="bg-gray-800/50 rounded-lg p-3">
                            {/* 引用回复 */}
                            {c.replyToContent && (
                              <div className="mb-2 pl-3 border-l-2 border-gray-600 text-gray-500 text-sm">
                                引用: {c.replyToContent.length > 50 ? c.replyToContent.slice(0, 50) + "..." : c.replyToContent}
                              </div>
                            )}
                            <p className="text-gray-300 text-sm">{c.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-gray-500 text-xs">
                                {new Date(c.createdAt).toLocaleString("zh-CN")}
                              </p>
                              <div className="flex items-center gap-2">
                                {isLoggedIn && (
                                  <>
                                    <button
                                      onClick={() => setReplyTo(c)}
                                      className="text-purple-400 hover:text-purple-300 text-xs"
                                    >
                                      回复
                                    </button>
                                    <button
                                      onClick={() => handlePrivateChat(c.userId)}
                                      className="text-blue-400 hover:text-blue-300 text-xs"
                                    >
                                      私聊
                                    </button>
                                  </>
                                )}
                                {c.isOwner && (
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-red-400 hover:text-red-300 text-xs"
                                  >
                                    删除
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reply indicator */}
                  {replyTo && (
                    <div className="mb-2 px-3 py-2 bg-purple-900/30 border border-purple-700 rounded-lg flex items-center justify-between">
                      <span className="text-purple-300 text-sm">
                        回复: {replyTo.content.length > 30 ? replyTo.content.slice(0, 30) + "..." : replyTo.content}
                      </span>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Add comment */}
                  {isLoggedIn ? (
                    <div className="space-y-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={replyTo ? "写下你的回复..." : "写下你的评论..."}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleComment}
                          disabled={!commentText.trim()}
                          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm"
                        >
                          {replyTo ? "发送回复" : "发送评论"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">登录后可以评论</p>
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
