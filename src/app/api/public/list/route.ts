import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()

    // 获取公开的消息集
    const publicMessages = await prisma.messageSet.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        publicAt: {
          lte: now
        }
      },
      include: {
        messages: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      take: 100
    })

    // 获取公开的时光邮件（已发送或发送失败且公开时间已到）
    const publicTimeMails = await prisma.timeMail.findMany({
      where: {
        isPublic: true,
        deletedAt: null,
        publicAt: {
          lte: now
        },
        status: {
          in: ['sent', 'failed', 'resent']
        }
      },
      take: 50
    })

    // 格式化消息集
    const formattedMessages = publicMessages.map(msg => ({
      id: msg.id,
      type: 'messageSet' as const,
      messages: msg.messages.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content
      })),
      createdAt: msg.createdAt,
      publicAt: msg.publicAt,
      likeCount: msg._count.likes,
      commentCount: msg._count.comments
    }))

    // 格式化时光邮件
    const formattedTimeMails = publicTimeMails.map(mail => ({
      id: `timemail_${mail.id}`,
      type: 'timeMail' as const,
      senderName: mail.senderName,
      toEmail: mail.toEmail.replace(/(.{2}).*@/, '$1***@'), // 隐藏部分邮箱
      subject: mail.subject,
      content: mail.content,
      scheduledAt: mail.scheduledAt,
      status: mail.status,
      createdAt: mail.createdAt,
      publicAt: mail.publicAt,
      sentAt: mail.sentAt,
      likeCount: 0,
      commentCount: 0,
      messages: [{
        id: 'content',
        type: 'text',
        content: mail.content
      }]
    }))

    // 合并并随机排序
    const allMessages = [...formattedMessages, ...formattedTimeMails]
    const shuffled = allMessages.sort(() => Math.random() - 0.5)

    return NextResponse.json({
      success: true,
      data: shuffled
    })
  } catch (error) {
    console.error('Get public messages error:', error)
    return NextResponse.json({ error: '获取公共频道失败' }, { status: 500 })
  }
}
