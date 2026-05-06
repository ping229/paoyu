import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageSetId = searchParams.get('messageSetId')

    if (!messageSetId) {
      return NextResponse.json({ error: '缺少信息集ID' }, { status: 400 })
    }

    const comments = await prisma.comment.findMany({
      where: { messageSetId },
      orderBy: { createdAt: 'asc' },
      include: {
        replyTo: true
      },
      take: 200
    })

    // 获取当前用户ID
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    let currentUserId: string | null = null

    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        currentUserId = payload.userId
      }
    }

    // 不显示评论者的用户名，但返回真码用于私聊
    const result = comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      userId: c.userId, // 真码，用于发送私聊泡泡
      replyToId: c.replyToId,
      replyToContent: c.replyTo?.content || null,
      isOwner: c.userId === currentUserId // 是否是本人的评论
    }))

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}
