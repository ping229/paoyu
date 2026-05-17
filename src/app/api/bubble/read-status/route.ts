import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取用户的阅读状态列表
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

    const { searchParams } = new URL(request.url)
    const messageSetIds = searchParams.get('ids')?.split(',').filter(Boolean) || []

    if (messageSetIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // 获取指定泡泡的阅读状态
    const readStatuses = await prisma.bubbleReadStatus.findMany({
      where: {
        userId: payload.userId,
        messageSetId: { in: messageSetIds }
      }
    })

    // 同时检查用户是否评论过这些泡泡
    const comments = await prisma.comment.findMany({
      where: {
        userId: payload.userId,
        messageSetId: { in: messageSetIds }
      },
      select: { messageSetId: true }
    })

    const commentedIds = new Set(comments.map(c => c.messageSetId))

    const result = messageSetIds.map(id => {
      const status = readStatuses.find(s => s.messageSetId === id)
      return {
        messageSetId: id,
        hasRead: status?.hasRead || false,
        hasCommented: status?.hasCommented || commentedIds.has(id)
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Get read status error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 标记泡泡为已读
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { messageSetId } = body

    if (!messageSetId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const now = new Date()

    // Upsert 阅读状态
    await prisma.bubbleReadStatus.upsert({
      where: {
        userId_messageSetId: {
          userId: payload.userId,
          messageSetId
        }
      },
      update: {
        hasRead: true,
        readAt: now
      },
      create: {
        userId: payload.userId,
        messageSetId,
        hasRead: true,
        readAt: now
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
