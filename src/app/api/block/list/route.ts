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

    // 获取屏蔽列表
    const blocks = await prisma.block.findMany({
      where: {
        blockerId: payload.userId
      },
      orderBy: { createdAt: 'desc' }
    })

    // 获取相关的消息集内容
    const blocksWithMessages = await Promise.all(
      blocks.map(async (block) => {
        let messageSet = null
        if (block.messageSetId) {
          messageSet = await prisma.messageSet.findUnique({
            where: { id: block.messageSetId },
            include: {
              messages: {
                orderBy: { order: 'asc' }
              }
            }
          })
        }

        return {
          id: block.id,
          summary: block.messageSummary,
          createdAt: block.createdAt,
          messageSetDeleted: block.messageSetId && !messageSet,
          messageSet: messageSet && !messageSet.isDeleted ? {
            id: messageSet.id,
            messages: messageSet.messages
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: blocksWithMessages
    })
  } catch (error) {
    console.error('List blocks error:', error)
    return NextResponse.json({
      success: false,
      error: '获取屏蔽列表失败'
    }, { status: 500 })
  }
}
