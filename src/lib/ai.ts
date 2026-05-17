import { prisma } from './prisma'

export interface AIConfigType {
  id: string
  name: string
  apiUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  systemPrompt: string | null
  isActive: boolean
  priority: number
}

export interface MessageContent {
  type: 'text' | 'image'
  content: string
}

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是「泡语」社区的一名热心网友，正在浏览公共频道。

你的任务是对用户发布的泡泡（消息）进行简短、友好的评论。

规则：
1. 评论要简短，控制在100字以内
2. 语气要友好、轻松，像朋友间的聊天
3. 可以表达共鸣、鼓励或温和的建议
4. 不要过于正式或说教
5. 如果是图片，可以描述你看到的或表达感受
6. 不要透露你是AI，以普通网友的身份交流
7. 用中文回复`

// 检查 AI 回复是否启用
export async function isAIReplyEnabled(): Promise<boolean> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'ai_reply_enabled' }
  })
  return config?.value === 'true'
}

// 获取所有启用的 AI 配置
export async function getActiveAIConfigs(): Promise<AIConfigType[]> {
  return prisma.aIConfig.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' }
  })
}

// 调用 AI API
export async function callAI(
  config: AIConfigType,
  messages: MessageContent[]
): Promise<{ success: boolean; response?: string; error?: string; duration?: number }> {
  const startTime = Date.now()

  try {
    // 构建消息内容
    const contentParts: string[] = []
    for (const msg of messages) {
      if (msg.type === 'text') {
        contentParts.push(msg.content)
      } else if (msg.type === 'image') {
        contentParts.push('[图片]')
      }
    }
    const userContent = contentParts.join('\n')

    // 判断是否是 Anthropic 兼容格式（百度千帆代码助手）
    const isAnthropic = config.apiUrl.includes('/anthropic/')

    let requestBody: any
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (isAnthropic) {
      // Anthropic 兼容格式（百度千帆代码助手）
      requestBody = {
        model: config.model,
        max_tokens: config.maxTokens,
        system: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userContent
          }
        ]
      }
      headers['x-api-key'] = config.apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      // OpenAI 兼容格式
      requestBody = {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature
      }
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `API 请求失败: ${response.status} - ${errorText}`,
        duration
      }
    }

    const data = await response.json()

    // 兼容多种响应格式
    let aiResponse: string | null = null
    if (isAnthropic) {
      // Anthropic 格式: content 数组中找 type='text' 的元素
      // 百度千帆返回: [{ type: 'thinking', ... }, { type: 'text', text: '...' }]
      const textBlock = data.content?.find((block: any) => block.type === 'text')
      aiResponse = textBlock?.text
    } else {
      // OpenAI 格式: choices[0].message.content
      aiResponse = data.choices?.[0]?.message?.content || data.response || data.message
    }

    if (!aiResponse) {
      return {
        success: false,
        error: 'AI 响应为空',
        duration
      }
    }

    return {
      success: true,
      response: aiResponse.trim(),
      duration
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      success: false,
      error: String(error),
      duration
    }
  }
}

// 为信息集生成 AI 评论
export async function generateAICommentsForMessageSet(
  messageSetId: string,
  messages: MessageContent[]
): Promise<void> {
  // 检查是否启用
  const enabled = await isAIReplyEnabled()
  if (!enabled) return

  // 获取启用的 AI 配置
  const configs = await getActiveAIConfigs()
  if (configs.length === 0) return

  // 构建消息内容摘要（用于日志）
  const contentSummary = messages
    .map(m => m.type === 'text' ? m.content.slice(0, 100) : '[图片]')
    .join(' | ')
    .slice(0, 500)

  // 查找或创建系统用户
  let systemUser = await prisma.user.findFirst({
    where: { username: '__system__' }
  })

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        username: '__system__',
        passwordHash: 'system',
        intercode: 'SYSTEM00'
      }
    })
  }

  // 为每个 AI 配置生成评论
  for (const config of configs) {
    try {
      const result = await callAI(config, messages)

      // 记录日志
      await prisma.aILog.create({
        data: {
          aiConfigId: config.id,
          messageSetId,
          messageContent: contentSummary,
          aiResponse: result.response,
          status: result.success ? 'success' : 'failed',
          errorMessage: result.error,
          duration: result.duration
        }
      })

      // 如果成功，创建评论
      if (result.success && result.response) {
        await prisma.comment.create({
          data: {
            messageSetId,
            userId: systemUser.id,
            content: result.response,
            isAIComment: true,
            aiConfigId: config.id
          }
        })
      }
    } catch (error) {
      console.error(`AI ${config.name} comment error:`, error)

      // 记录错误日志
      await prisma.aILog.create({
        data: {
          aiConfigId: config.id,
          messageSetId,
          messageContent: contentSummary,
          status: 'failed',
          errorMessage: String(error)
        }
      })
    }
  }
}

// 测试 AI 对话
export async function testAI(
  config: AIConfigType,
  testMessage: string
): Promise<{ success: boolean; response?: string; error?: string; duration?: number }> {
  return callAI(config, [{ type: 'text', content: testMessage }])
}
