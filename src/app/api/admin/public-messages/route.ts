import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取公共频道信息列表
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 获取公开的信息集
    const messages = await prisma.messageSet.findMany({
      where: {
        isPublic: true
      },
      include: {
        messages: {
          orderBy: { order: 'asc' }
        },
        comments: {
          select: { id: true }
        },
        likes: {
          select: { id: true }
        }
      },
      orderBy: { publicAt: 'desc' },
      skip,
      take: limit
    })

    const total = await prisma.messageSet.count({
      where: { isPublic: true }
    })

    const result = messages.map(msg => ({
      id: msg.id,
      createdAt: msg.createdAt,
      publicAt: msg.publicAt,
      messages: msg.messages.map(m => ({
        type: m.type,
        content: m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content
      })),
      commentCount: msg.comments.length,
      likeCount: msg.likes.length
    }))

    return NextResponse.json({
      success: true,
      data: {
        messages: result,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get public messages error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 删除公共频道信息
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const messageSetId = searchParams.get('id')

    if (!messageSetId) {
      return NextResponse.json({ error: '缺少信息集ID' }, { status: 400 })
    }

    // 删除信息集（会级联删除相关的评论、点赞等）
    await prisma.messageSet.delete({
      where: { id: messageSetId }
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Delete public message error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
