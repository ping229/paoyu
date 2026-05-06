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

    // 获取点赞总数
    const likeCount = await prisma.like.count({
      where: { messageSetId }
    })

    // 检查当前用户是否已点赞
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    let liked = false
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        const existingLike = await prisma.like.findUnique({
          where: {
            messageSetId_userId: {
              messageSetId,
              userId: payload.userId
            }
          }
        })
        liked = !!existingLike
      }
    }

    return NextResponse.json({
      success: true,
      data: { likeCount, liked }
    })
  } catch (error) {
    console.error('Get like status error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
