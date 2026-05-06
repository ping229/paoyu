import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: '登录已过期'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // received, sent

    if (type === 'sent') {
      // 获取发送的消息
      const messages = await prisma.messageSet.findMany({
        where: {
          senderId: payload.userId,
          isDeleted: false
        },
        include: {
          messages: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      return NextResponse.json({
        success: true,
        data: messages
      })
    }

    // 获取收到的消息
    const messages = await prisma.messageSet.findMany({
      where: {
        receiverId: payload.userId,
        isDeleted: false
      },
      include: {
        messages: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // 分离未读和已读
    const unread = messages.filter(m => !m.isRead).slice(0, 20)
    const read = messages.filter(m => m.isRead)

    return NextResponse.json({
      success: true,
      data: {
        unread,
        read,
        total: messages.length
      }
    })
  } catch (error) {
    console.error('List messages error:', error)
    return NextResponse.json({
      success: false,
      error: '获取消息失败'
    }, { status: 500 })
  }
}
