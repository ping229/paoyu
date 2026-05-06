import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <main className="max-w-2xl text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            泡语
          </h1>
          <p className="text-purple-300 text-sm mb-4">异世界真心话</p>
          <div className="text-gray-300 text-lg leading-relaxed space-y-4">
            <p className="text-purple-300 font-medium">
              这里不是现实。
            </p>
            <p>
              没有名字，没有头像，没有过去。
            </p>
            <p>
              只有一个8位交互码，和一颗想说真话的心。
            </p>
            <p className="text-gray-400 italic">
              把你的秘密、忏悔、温柔或孤独，装进泡泡，飘向陌生的另一个人。
            </p>
          </div>
        </div>

        {/* Contract Notice */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
          <p className="text-gray-400 text-sm">
            请守护彼此的匿名。不要把异世界的话，带到那边的世界去。
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            进入异世界
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-gray-700 hover:border-purple-500 text-gray-300 hover:text-purple-400 font-medium rounded-lg transition-colors"
          >
            我有交互码
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <div className="text-purple-400 text-2xl mb-2">💭</div>
            <h3 className="text-gray-200 font-medium mb-1">匿名消息</h3>
            <p className="text-gray-500 text-sm">
              用泡泡传递你的心声，对方永远不会知道你是谁
            </p>
          </div>
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <div className="text-purple-400 text-2xl mb-2">⏰</div>
            <h3 className="text-gray-200 font-medium mb-1">时间胶囊</h3>
            <p className="text-gray-500 text-sm">
              寄出一封未来的信，一个月后公开在公共频道
            </p>
          </div>
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-5">
            <div className="text-purple-400 text-2xl mb-2">🔒</div>
            <h3 className="text-gray-200 font-medium mb-1">完全匿名</h3>
            <p className="text-gray-500 text-sm">
              可刷新的交互码，可自我摧毁的账户，无迹可寻
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
