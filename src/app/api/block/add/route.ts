import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { generateMessageSummary } from '@/lib/utils'

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
        error: '请指定要屏蔽的消息集'
      }, { status: 400 })
    }

    // 获取消息集
    const messageSet = await prisma.messageSet.findFirst({
      where: {
        id: messageSetId,
        receiverId: payload.userId
      },
      include: {
        messages: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!messageSet) {
      return NextResponse.json({
        success: false,
        error: '消息不存在'
      }, { status: 404 })
    }

    // 检查是否已经屏蔽
    const existingBlock = await prisma.block.findFirst({
      where: {
        blockerId: payload.userId,
        blockedId: messageSet.senderId
      }
    })

    if (existingBlock) {
      return NextResponse.json({
        success: false,
        error: '已经屏蔽过该用户'
      }, { status: 400 })
    }

    // 生成消息摘要
    const summary = generateMessageSummary(messageSet.messages)

    // 创建屏蔽记录
    await prisma.block.create({
      data: {
        blockerId: payload.userId,
        blockedId: messageSet.senderId,
        messageSetId,
        messageSummary: summary
      }
    })

    return NextResponse.json({
      success: true,
      data: { blocked: true }
    })
  } catch (error) {
    console.error('Block error:', error)
    return NextResponse.json({
      success: false,
      error: '屏蔽失败'
    }, { status: 500 })
  }
}
