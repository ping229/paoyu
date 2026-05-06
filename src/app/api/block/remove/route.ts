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
    const { blockId } = body

    if (!blockId) {
      return NextResponse.json({
        success: false,
        error: '请指定要解除的屏蔽'
      }, { status: 400 })
    }

    // 查找屏蔽记录
    const block = await prisma.block.findFirst({
      where: {
        id: blockId,
        blockerId: payload.userId
      }
    })

    if (!block) {
      return NextResponse.json({
        success: false,
        error: '屏蔽记录不存在'
      }, { status: 404 })
    }

    // 删除屏蔽记录
    await prisma.block.delete({
      where: { id: blockId }
    })

    // 补发被屏蔽期间的消息
    const pendingMessages = await prisma.messageSet.findMany({
      where: {
        receiverId: payload.userId,
        senderId: block.blockedId,
        isDeleted: false,
        createdAt: {
          gte: block.createdAt
        }
      }
    })

    // 这些消息现在可以被看到了（不需要特殊处理，因为屏蔽已解除）

    return NextResponse.json({
      success: true,
      data: {
        unblocked: true,
        pendingCount: pendingMessages.length
      }
    })
  } catch (error) {
    console.error('Unblock error:', error)
    return NextResponse.json({
      success: false,
      error: '解除屏蔽失败'
    }, { status: 500 })
  }
}
