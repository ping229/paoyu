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
    const { messageSetId, reason } = body

    if (!messageSetId) {
      return NextResponse.json({
        success: false,
        error: '请指定要举报的消息集'
      }, { status: 400 })
    }

    // 获取消息集
    const messageSet = await prisma.messageSet.findFirst({
      where: {
        id: messageSetId,
        receiverId: payload.userId
      }
    })

    if (!messageSet) {
      return NextResponse.json({
        success: false,
        error: '消息不存在'
      }, { status: 404 })
    }

    // 检查是否已经举报过
    const existingReport = await prisma.report.findUnique({
      where: { messageSetId }
    })

    if (existingReport) {
      return NextResponse.json({
        success: false,
        error: '该消息已被举报过'
      }, { status: 400 })
    }

    // 创建举报记录
    await prisma.report.create({
      data: {
        reporterId: payload.userId,
        reportedId: messageSet.senderId,
        messageSetId,
        reason: reason || null,
        status: 'pending'
      }
    })

    return NextResponse.json({
      success: true,
      data: { reported: true }
    })
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({
      success: false,
      error: '举报失败'
    }, { status: 500 })
  }
}
