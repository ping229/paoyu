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
    const { commentId } = body

    if (!commentId) {
      return NextResponse.json({ error: '缺少评论ID' }, { status: 400 })
    }

    // 查找评论
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 })
    }

    // 验证是评论者本人
    if (comment.userId !== payload.userId) {
      return NextResponse.json({ error: '只能删除自己的评论' }, { status: 403 })
    }

    // 删除评论
    await prisma.comment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
