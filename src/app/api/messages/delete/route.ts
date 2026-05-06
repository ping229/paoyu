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

    // 验证是否是接收者
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

    // 软删除
    await prisma.messageSet.update({
      where: { id: messageSetId },
      data: { isDeleted: true }
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({
      success: false,
      error: '删除失败'
    }, { status: 500 })
  }
}
