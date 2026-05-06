import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { isValidIntercode } from '@/lib/intercode'

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
    const { targetIntercode, targetUserId, messages, scheduledAt, isPublic, targetEmail } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        success: false,
        error: '消息不能为空'
      }, { status: 400 })
    }

    // 验证每条消息
    for (const msg of messages) {
      if (!['text', 'image', 'voice'].includes(msg.type)) {
        return NextResponse.json({
          success: false,
          error: '消息类型不正确'
        }, { status: 400 })
      }
      if (!msg.content) {
        return NextResponse.json({
          success: false,
          error: '消息内容不能为空'
        }, { status: 400 })
      }
    }

    const senderId = payload.userId
    let receiverId: string | null = null

    // 确定接收者
    if (targetUserId) {
      // 通过真码直接发送（用于回复）
      receiverId = targetUserId
    } else if (targetIntercode) {
      // 通过交互码发送
      if (!isValidIntercode(targetIntercode.toUpperCase())) {
        return NextResponse.json({
          success: false,
          error: '目标交互码格式不正确'
        }, { status: 400 })
      }

      const targetUser = await prisma.user.findUnique({
        where: { intercode: targetIntercode.toUpperCase() }
      })

      if (targetUser) {
        receiverId = targetUser.id
      }
    }

    // 定时发送处理
    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt)

      // 创建定时任务和信息集
      await prisma.scheduledTask.create({
        data: {
          senderId,
          receiverId: receiverId,
          targetEmail: targetEmail,
          scheduledAt: scheduleDate,
          isPublic: isPublic || false
        }
      })

      const messageSet = await prisma.messageSet.create({
        data: {
          senderId,
          receiverId: receiverId || '',
          scheduledAt: scheduleDate,
          isPublic: isPublic || false,
          messages: {
            create: messages.map((msg, index) => ({
              type: msg.type,
              content: msg.content,
              order: index
            }))
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: { messageSetId: messageSet.id, scheduled: true }
      })
    }

    // 立即发送 - 必须有接收者
    if (!receiverId) {
      // 目标不存在，静默丢弃
      return NextResponse.json({
        success: true,
        data: { sent: true }
      })
    }

    // 检查是否被屏蔽
    const blocked = await prisma.block.findFirst({
      where: {
        blockerId: receiverId,
        blockedId: senderId
      }
    })

    if (blocked) {
      // 被屏蔽，静默丢弃
      return NextResponse.json({
        success: true,
        data: { sent: true }
      })
    }

    // 创建信息集
    const messageSet = await prisma.messageSet.create({
      data: {
        senderId,
        receiverId: receiverId,
        messages: {
          create: messages.map((msg, index) => ({
            type: msg.type,
            content: msg.content,
            order: index
          }))
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { sent: true, messageSetId: messageSet.id }
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({
      success: false,
      error: '发送失败，请稍后重试'
    }, { status: 500 })
  }
}
