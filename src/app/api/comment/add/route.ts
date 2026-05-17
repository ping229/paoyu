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
    const { messageSetId, content, replyToId } = body

    if (!messageSetId || !content || !content.trim()) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    // 限制评论长度
    const trimmedContent = content.trim()
    if (trimmedContent.length > 5000) {
      return NextResponse.json({ error: '评论内容不能超过5000个字符' }, { status: 400 })
    }

    // 验证信息集存在且是公开的
    const messageSet = await prisma.messageSet.findFirst({
      where: {
        id: messageSetId,
        isPublic: true
      }
    })

    if (!messageSet) {
      return NextResponse.json({ error: '信息集不存在或未公开' }, { status: 404 })
    }

    // 如果是回复，验证被回复的评论存在
    let replyToComment = null
    if (replyToId) {
      replyToComment = await prisma.comment.findUnique({
        where: { id: replyToId }
      })
      if (!replyToComment) {
        return NextResponse.json({ error: '被回复的评论不存在' }, { status: 404 })
      }
    }

    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        messageSetId,
        userId: payload.userId,
        content: content.trim(),
        replyToId: replyToId || null
      }
    })

    // 更新阅读状态：标记为已评论
    await prisma.bubbleReadStatus.upsert({
      where: {
        userId_messageSetId: {
          userId: payload.userId,
          messageSetId
        }
      },
      update: {
        hasCommented: true,
        hasRead: true
      },
      create: {
        userId: payload.userId,
        messageSetId,
        hasCommented: true,
        hasRead: true,
        readAt: new Date()
      }
    })

    // 如果是回复别人的评论，发送通知泡泡给被回复者
    if (replyToComment && replyToComment.userId && replyToComment.userId !== payload.userId) {
      // 创建通知泡泡
      await prisma.messageSet.create({
        data: {
          senderId: payload.userId,
          receiverId: replyToComment.userId,
          isCommentReply: true,
          commentMessageSetId: messageSetId,
          messages: {
            create: [
              {
                type: 'text',
                content: `有人在公共频道回复了你的评论：\n\n"${content.trim()}"`,
                order: 0
              }
            ]
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        replyToId: comment.replyToId
      }
    })
  } catch (error) {
    console.error('Add comment error:', error)
    return NextResponse.json({ error: '评论失败' }, { status: 500 })
  }
}
