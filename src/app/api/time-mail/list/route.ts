import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    // 获取用户的时光邮件
    const timeMails = await prisma.timeMail.findMany({
      where: {
        senderId: payload.userId
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // 隐藏收件人邮箱的部分信息
    const result = timeMails.map(mail => ({
      id: mail.id,
      senderName: mail.senderName,
      toEmail: mail.toEmail.replace(/(.{2}).+(@.+)/, '$1***$2'),
      subject: mail.subject,
      scheduledAt: mail.scheduledAt,
      isSent: mail.isSent,
      createdAt: mail.createdAt
    }))

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Get time mail list error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
