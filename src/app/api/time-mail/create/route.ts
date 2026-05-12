import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取监管配置
async function getModerationConfig() {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: { in: ['time_mail_moderation', 'time_mail_keywords'] }
    }
  })

  const config: Record<string, string> = {}
  for (const c of configs) {
    config[c.key] = c.value
  }

  return {
    mode: config.time_mail_moderation || 'none', // none/full/keyword
    keywords: config.time_mail_keywords ? JSON.parse(config.time_mail_keywords) : []
  }
}

// 检查是否包含关键词
function containsKeywords(content: string, subject: string, keywords: string[]): string | null {
  const fullText = `${subject} ${content}`.toLowerCase()
  for (const keyword of keywords) {
    if (fullText.includes(keyword.toLowerCase())) {
      return keyword
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    // 登录用户优先，但也允许匿名发送
    let userId = null
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        userId = payload.userId
      }
    }

    const body = await request.json()
    const { senderName, senderEmail, toEmail, subject, content, scheduledAt, isPublic } = body

    // 验证必填字段
    if (!toEmail || !subject || !content || !scheduledAt) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(toEmail)) {
      return NextResponse.json({ error: '收件人邮箱格式不正确' }, { status: 400 })
    }

    // 验证发送时间（必须在未来）
    const scheduledDate = new Date(scheduledAt)
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: '发送时间必须在未来' }, { status: 400 })
    }

    // 验证内容长度
    if (content.length > 10000) {
      return NextResponse.json({ error: '邮件内容不能超过10000个字符' }, { status: 400 })
    }

    // 获取监管配置
    const moderationConfig = await getModerationConfig()

    // 确定初始状态
    let initialStatus = 'approved'
    let needReview = false

    if (moderationConfig.mode === 'full') {
      // 完全监管：所有邮件都需要审核
      initialStatus = 'pending'
      needReview = true
    } else if (moderationConfig.mode === 'keyword') {
      // 关键词监管：检查是否包含关键词
      const matchedKeyword = containsKeywords(content, subject, moderationConfig.keywords)
      if (matchedKeyword) {
        initialStatus = 'pending'
        needReview = true
      }
    }
    // none 模式：直接 approved

    // 计算公开时间
    // publicAt = min(发送时间, 创建时间+1个月)
    // 但发送时间在未来，所以创建时先设置为创建时间+1个月
    // 当邮件发送成功后，如果发送时间更早，则更新为发送时间
    const oneMonthLater = new Date()
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)

    // 创建时光邮件
    const timeMail = await prisma.timeMail.create({
      data: {
        senderId: userId,
        senderName: senderName || '匿名者',
        senderEmail: senderEmail || null,
        toEmail,
        subject,
        content,
        scheduledAt: scheduledDate,
        status: initialStatus,
        isPublic: isPublic !== false, // 默认公开
        publicAt: isPublic !== false ? oneMonthLater : null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: timeMail.id,
        scheduledAt: timeMail.scheduledAt,
        status: timeMail.status,
        needReview
      }
    })
  } catch (error) {
    console.error('Create time mail error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
