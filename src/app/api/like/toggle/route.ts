import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

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
      return NextResponse.json({ error: '缺少信息集ID' }, { status: 400 })
    }

    // 检查是否已点赞
    const existingLike = await prisma.like.findUnique({
      where: {
        messageSetId_userId: {
          messageSetId,
          userId: payload.userId
        }
      }
    })

    if (existingLike) {
      // 取消点赞
      await prisma.like.delete({
        where: { id: existingLike.id }
      })

      return NextResponse.json({
        success: true,
        data: { liked: false }
      })
    } else {
      // 点赞
      await prisma.like.create({
        data: {
          messageSetId,
          userId: payload.userId
        }
      })

      return NextResponse.json({
        success: true,
        data: { liked: true }
      })
    }
  } catch (error) {
    console.error('Toggle like error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
