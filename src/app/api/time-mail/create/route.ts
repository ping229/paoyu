import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

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
    const { senderName, senderEmail, toEmail, subject, content, scheduledAt } = body

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

    // 创建时光邮件
    const timeMail = await prisma.timeMail.create({
      data: {
        senderId: userId,
        senderName: senderName || '匿名者',
        senderEmail: senderEmail || null,
        toEmail,
        subject,
        content,
        scheduledAt: scheduledDate
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: timeMail.id,
        scheduledAt: timeMail.scheduledAt
      }
    })
  } catch (error) {
    console.error('Create time mail error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
