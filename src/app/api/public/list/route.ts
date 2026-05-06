import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 获取公开的消息集
    const publicMessages = await prisma.messageSet.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        publicAt: {
          lte: new Date()
        }
      },
      include: {
        messages: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      take: 100
    })

    // 随机排序
    const shuffled = publicMessages.sort(() => Math.random() - 0.5)

    // 不显示发送者信息
    const result = shuffled.map(msg => ({
      id: msg.id,
      messages: msg.messages,
      createdAt: msg.createdAt,
      publicAt: msg.publicAt,
      likeCount: msg._count.likes,
      commentCount: msg._count.comments
    }))

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Get public messages error:', error)
    return NextResponse.json({ error: '获取公共频道失败' }, { status: 500 })
  }
}
