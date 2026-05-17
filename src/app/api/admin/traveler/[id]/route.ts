import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 查找或创建系统用户
async function getOrCreateSystemUser() {
  let systemUser = await prisma.user.findUnique({
    where: { username: '__system__' }
  })

  if (!systemUser) {
    const { generateUniqueIntercode } = await import('@/lib/intercode')
    const intercode = await generateUniqueIntercode()

    systemUser = await prisma.user.create({
      data: {
        username: '__system__',
        passwordHash: 'SYSTEM_USER_NO_LOGIN',
        intercode: intercode,
      }
    })
  }

  return systemUser
}

// 发送通知泡泡给用户
async function sendNotificationBubble(userId: string, content: string) {
  const systemUser = await getOrCreateSystemUser()

  await prisma.messageSet.create({
    data: {
      senderId: systemUser.id,
      receiverId: userId,
      messages: {
        create: [{
          type: 'text',
          content,
          order: 0
        }]
      }
    }
  })
}

// 封禁称号
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { recordId, action } = body

    if (!recordId || !action) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 获取旅人录
    const record = await prisma.travelerRecord.findUnique({
      where: { id: recordId },
      include: { user: { select: { intercode: true } } }
    })

    if (!record) {
      return NextResponse.json({ error: '旅人录不存在' }, { status: 404 })
    }

    if (action === 'ban-title') {
      // 封禁称号
      const originalTitle = record.title

      await prisma.$transaction([
        prisma.travelerRecord.update({
          where: { id: recordId },
          data: {
            titleBanned: true,
            titleBanCount: { increment: 1 }
          }
        }),
        prisma.travelerBanHistory.create({
          data: {
            recordId,
            banType: 'title',
            originalContent: originalTitle,
            adminId: payload.userId
          }
        }),
        prisma.adminLog.create({
          data: {
            adminId: payload.userId,
            action: 'ban_traveler_title',
            targetId: recordId,
            details: `封禁称号: "${originalTitle}" (用户交互码: ${record.user.intercode})`
          }
        })
      ])

      // 发送通知泡泡
      await sendNotificationBubble(
        record.userId,
        `【系统通知】您在集会中的称号「${originalTitle}」已被管理员封禁。\n\n请前往设置页面修改您的称号，修改后将自动解除封禁状态。`
      )

      return NextResponse.json({
        success: true,
        message: '称号已封禁，已通知用户'
      })
    }

    if (action === 'ban-desc') {
      // 封禁描述
      const originalDesc = record.description || '(空)'

      await prisma.$transaction([
        prisma.travelerRecord.update({
          where: { id: recordId },
          data: {
            descBanned: true,
            descBanCount: { increment: 1 }
          }
        }),
        prisma.travelerBanHistory.create({
          data: {
            recordId,
            banType: 'desc',
            originalContent: originalDesc,
            adminId: payload.userId
          }
        }),
        prisma.adminLog.create({
          data: {
            adminId: payload.userId,
            action: 'ban_traveler_desc',
            targetId: recordId,
            details: `封禁描述: "${originalDesc}" (用户交互码: ${record.user.intercode})`
          }
        })
      ])

      // 发送通知泡泡
      await sendNotificationBubble(
        record.userId,
        `【系统通知】您在集会中的描述已被管理员封禁。\n\n请前往设置页面修改您的描述，修改后将自动解除封禁状态。`
      )

      return NextResponse.json({
        success: true,
        message: '描述已封禁，已通知用户'
      })
    }

    if (action === 'unban-title') {
      // 解除称号封禁
      await prisma.travelerRecord.update({
        where: { id: recordId },
        data: { titleBanned: false }
      })

      return NextResponse.json({
        success: true,
        message: '称号封禁已解除'
      })
    }

    if (action === 'unban-desc') {
      // 解除描述封禁
      await prisma.travelerRecord.update({
        where: { id: recordId },
        data: { descBanned: false }
      })

      return NextResponse.json({
        success: true,
        message: '描述封禁已解除'
      })
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error) {
    console.error('Admin traveler action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}

// 修改称号
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { recordId, title } = body

    if (!recordId || !title) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 验证称号长度
    if (title.length < 2 || title.length > 20) {
      return NextResponse.json({ error: '称号长度需要在2-20字之间' }, { status: 400 })
    }

    // 获取旅人录
    const record = await prisma.travelerRecord.findUnique({
      where: { id: recordId },
      include: { user: { select: { intercode: true } } }
    })

    if (!record) {
      return NextResponse.json({ error: '旅人录不存在' }, { status: 404 })
    }

    const originalTitle = record.title

    await prisma.$transaction([
      prisma.travelerRecord.update({
        where: { id: recordId },
        data: {
          title,
          titleBanned: false // 解除封禁
        }
      }),
      prisma.adminLog.create({
        data: {
          adminId: payload.userId,
          action: 'modify_traveler_title',
          targetId: recordId,
          details: `修改称号: "${originalTitle}" -> "${title}" (用户交互码: ${record.user.intercode})`
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: '称号已修改'
    })
  } catch (error) {
    console.error('Modify traveler title error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
