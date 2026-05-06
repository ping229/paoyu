import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { messageSetId } = body

    if (!messageSetId) {
      return NextResponse.json({
        success: false,
        error: '消息集ID不能为空'
      }, { status: 400 })
    }

    // 标记为已读
    const messageSet = await prisma.messageSet.updateMany({
      where: {
        id: messageSetId,
        receiverId: payload.userId
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      success: true,
      data: { updated: messageSet.count > 0 }
    })
  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({
      success: false,
      error: '操作失败'
    }, { status: 500 })
  }
}
