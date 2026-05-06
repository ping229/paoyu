export default function AboutPage() {
  return (
    <div className="min-h-[80vh] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-400 mb-8 text-center">
          泡语 · 异世界真心话
        </h1>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 mb-8">
          <div className="text-gray-300 space-y-6 leading-relaxed">
            <p>
              我们相信，每个人都需要一个不用伪装的地方。
            </p>

            <div className="bg-gray-800/50 rounded-lg p-6 border-l-4 border-purple-500">
              <p className="text-purple-300 font-medium mb-2">在这里：</p>
              <p className="text-gray-400">
                你看不见我，我看不见你。我们只通过"交互码"相遇。
              </p>
            </div>

            <p>
              每一段对话都是一个"信息集"——你可以连续发送多条短消息，像真实的交谈，但永远不会知道对方是谁。
            </p>

            <p>
              你可以定时寄出一封时间胶囊，一个月后公开在公共频道，让陌生人随机读到你的过去。
            </p>

            <p>
              你可以屏蔽、删除、甚至"自我摧毁"——彻底消失，不留痕迹。
            </p>

            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
              <p className="text-red-400 font-medium mb-2">唯一的规则：</p>
              <p className="text-gray-400 text-sm">
                不要试图推断对方的现实身份，不要在线下提及这里的话，不要索取联系方式。
              </p>
              <p className="text-red-400 text-sm mt-2">
                如果违背，你可能会永远失去这个异世界。
              </p>
            </div>

            <p className="text-center text-gray-400 italic">
              我们不完美，但我们在努力守护一块只说真心话的飞地。
            </p>

            <p className="text-center text-purple-400 font-medium">
              欢迎你，匿名旅人。
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-200 mb-4">如何使用</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-400 text-sm">
            <li>
              <span className="text-gray-300">注册</span> - 同意契约后获得一个8位交互码
            </li>
            <li>
              <span className="text-gray-300">登录</span> - 用交互码登录，无需密码
            </li>
            <li>
              <span className="text-gray-300">发送泡泡</span> - 输入对方的交互码，编辑信息集后发送
            </li>
            <li>
              <span className="text-gray-300">接收泡泡</span> - 在主页查看漂浮的泡泡，点击查看内容
            </li>
            <li>
              <span className="text-gray-300">时间胶囊</span> - 定时发送超过一个月的消息可选择公开到公共频道
            </li>
            <li>
              <span className="text-gray-300">刷新交互码</span> - 每24小时可刷新一次，获得新的交互码
            </li>
            <li>
              <span className="text-gray-300">自我摧毁</span> - 随时可以注销账号，删除所有数据
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
