"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TravelerRecord {
  id: string;
  travelerId: string | null;
  title: string;
  description: string | null;
  intercode: string;
  userId: string; // 真码
  hasValidTitle: boolean;
  hasValidDesc: boolean;
}

export default function GatheringPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TravelerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchRecords();
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, [page]);

  const fetchRecords = async () => {
    try {
      const res = await fetch(`/api/gathering/list?page=${page}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error("Fetch records error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBubble = (userId: string) => {
    if (!isLoggedIn) {
      alert("请先登录");
      router.push("/login");
      return;
    }
    // 使用真码发送，避免用户修改交互码后发送失败
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
        <h1 className="text-2xl font-bold text-purple-400 mb-2">集会</h1>
        <p className="text-gray-500 text-sm mb-8">
          在这里遇见有趣的旅人，点击卡片可以发送泡泡
        </p>

        {records.length === 0 ? (
          <div className="text-gray-500 text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            暂无旅人
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-purple-500/50 transition-colors"
                >
                  {/* 称号 */}
                  <div className="mb-3">
                    <h3 className={`text-lg font-medium ${record.hasValidTitle ? 'text-purple-400' : 'text-gray-500 italic'}`}>
                      {record.title}
                    </h3>
                  </div>

                  {/* 描述 */}
                  <div className="mb-4 min-h-[60px]">
                    {record.description ? (
                      <p className={`text-sm ${record.hasValidDesc ? 'text-gray-400' : 'text-gray-500 italic'}`}>
                        {record.description}
                      </p>
                    ) : (
                      <p className="text-gray-600 text-sm italic">这位旅人还没有留下描述</p>
                    )}
                  </div>

                  {/* 旅人ID */}
                  <div className="mb-4">
                    <p className="text-gray-500 text-xs">
                      旅人ID: <span className="text-purple-400 font-mono">{record.travelerId || '未生成'}</span>
                    </p>
                  </div>

                  {/* 发送泡泡按钮 */}
                  <button
                    onClick={() => handleSendBubble(record.userId)}
                    className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm transition-colors"
                  >
                    发送泡泡
                  </button>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-300 rounded text-sm"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-gray-400 text-sm">
                  第 {page} 页 / 共 {totalPages} 页
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-500 text-gray-300 rounded text-sm"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            想要展示自己的旅人录？前往
            <a href="/settings" className="text-purple-400 hover:text-purple-300 ml-1">设置页面</a>
            编辑
          </p>
        </div>
      </div>
    </div>
  );
}
