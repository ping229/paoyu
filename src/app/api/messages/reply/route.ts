import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取消息集的发送者真码（用于回复）
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
    const messageSetId = searchParams.get('messageSetId')

    if (!messageSetId) {
      return NextResponse.json({ error: '缺少消息集ID' }, { status: 400 })
    }

    // 验证该用户是消息集的接收者
    const messageSet = await prisma.messageSet.findFirst({
      where: {
        id: messageSetId,
        receiverId: payload.userId
      },
      select: {
        senderId: true
      }
    })

    if (!messageSet) {
      return NextResponse.json({ error: '消息不存在' }, { status: 404 })
    }

    // 返回发送者的真码（前端看不到，只用于API调用）
    return NextResponse.json({
      success: true,
      data: { senderId: messageSet.senderId }
    })
  } catch (error) {
    console.error('Get sender error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
