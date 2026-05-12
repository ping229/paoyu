import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取时光邮件列表
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
    const status = searchParams.get('status') // 'pending', 'approved', 'rejected', 'sent', 'failed', 'resent', 'all'
    const reviewStatus = searchParams.get('reviewStatus') // 'pending', 'approved', 'rejected'
    const search = searchParams.get('search') // 搜索创建者真码或收件人邮箱
    const limit = 20
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {}

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status
    }

    // 审核状态筛选
    if (reviewStatus === 'pending') {
      where.status = 'pending'
    } else if (reviewStatus === 'approved') {
      where.status = { in: ['approved', 'sent', 'failed', 'resent'] }
    } else if (reviewStatus === 'rejected') {
      where.status = 'rejected'
    }

    // 搜索
    if (search) {
      where.OR = [
        { senderId: { contains: search } },
        { toEmail: { contains: search } }
      ]
    }

    const [mails, total] = await Promise.all([
      prisma.timeMail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timeMail.count({ where })
    ])

    // 统计各状态数量
    const stats = await Promise.all([
      prisma.timeMail.count({ where: { status: 'pending' } }),
      prisma.timeMail.count({ where: { status: 'approved' } }),
      prisma.timeMail.count({ where: { status: 'rejected' } }),
      prisma.timeMail.count({ where: { status: 'sent' } }),
      prisma.timeMail.count({ where: { status: 'failed' } }),
      prisma.timeMail.count({ where: { status: 'resent' } }),
      prisma.timeMail.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        mails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        stats: {
          pending: stats[0],
          approved: stats[1],
          rejected: stats[2],
          sent: stats[3],
          failed: stats[4],
          resent: stats[5],
          total: stats[6],
        }
      }
    })
  } catch (error) {
    console.error('Get time mails error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 更新邮件状态或删除邮件
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
    const { action, ids, id, status, lastError, deleteReason } = body

    // 批量操作
    if (action === 'delete' && ids && Array.isArray(ids)) {
      return await handleBatchDelete(ids, deleteReason)
    }

    // 单个更新
    if (id) {
      const updateData: any = {}

      if (status) {
        updateData.status = status
        if (status === 'sent') {
          updateData.isSent = true
          updateData.sentAt = new Date()
        }
      }

      if (lastError !== undefined) {
        updateData.lastError = lastError
      }

      const mail = await prisma.timeMail.update({
        where: { id },
        data: updateData
      })

      return NextResponse.json({
        success: true,
        data: mail
      })
    }

    return NextResponse.json({ error: '无效的请求' }, { status: 400 })
  } catch (error) {
    console.error('Update time mail error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

// 删除单个邮件
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
    const id = searchParams.get('id')
    const deleteReason = searchParams.get('deleteReason') || '管理员删除'

    if (!id) {
      return NextResponse.json({ error: '缺少邮件ID' }, { status: 400 })
    }

    return await handleSingleDelete(id, deleteReason)
  } catch (error) {
    console.error('Delete time mail error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}

// 处理单个删除
async function handleSingleDelete(id: string, deleteReason: string) {
  const mail = await prisma.timeMail.findUnique({
    where: { id }
  })

  if (!mail) {
    return NextResponse.json({ error: '邮件不存在' }, { status: 404 })
  }

  // 只能删除未发送的邮件
  if (mail.status === 'sent' || mail.status === 'failed' || mail.status === 'resent') {
    return NextResponse.json({ error: '无法删除已发送的邮件' }, { status: 400 })
  }

  // 如果有发送者ID，发送泡泡通知
  if (mail.senderId) {
    await sendDeletionNotification(mail.senderId, mail, deleteReason)
  }

  // 标记为已删除（软删除）
  await prisma.timeMail.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deleteReason
    }
  })

  return NextResponse.json({
    success: true,
    message: '删除成功'
  })
}

// 处理批量删除
async function handleBatchDelete(ids: string[], deleteReason: string) {
  const mails = await prisma.timeMail.findMany({
    where: {
      id: { in: ids },
      status: { notIn: ['sent', 'failed', 'resent'] }
    }
  })

  // 发送通知给有发送者的邮件
  for (const mail of mails) {
    if (mail.senderId) {
      await sendDeletionNotification(mail.senderId, mail, deleteReason)
    }
  }

  // 批量软删除
  await prisma.timeMail.updateMany({
    where: {
      id: { in: mails.map(m => m.id) }
    },
    data: {
      deletedAt: new Date(),
      deleteReason
    }
  })

  return NextResponse.json({
    success: true,
    message: `成功删除 ${mails.length} 封邮件`,
    deletedCount: mails.length,
    skippedCount: ids.length - mails.length
  })
}

// 发送删除通知泡泡
async function sendDeletionNotification(senderId: string, mail: any, deleteReason: string) {
  try {
    // 查找或创建系统用户
    let systemUser = await prisma.user.findFirst({
      where: { username: '__system__' }
    })

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          username: '__system__',
          passwordHash: 'system',
          intercode: 'SYSTEM00'
        }
      })
    }

    // 创建通知消息
    const notificationContent = `你创建的时光邮件已被管理员删除。

邮件主题：${mail.subject}
定时发送时间：${new Date(mail.scheduledAt).toLocaleString('zh-CN')}

管理员留言：${deleteReason}

如有疑问，请联系管理员。`

    await prisma.messageSet.create({
      data: {
        senderId: systemUser.id,
        receiverId: senderId,
        isPublic: false,
        messages: {
          create: [{
            type: 'text',
            content: notificationContent,
            order: 0
          }]
        }
      }
    })
  } catch (error) {
    console.error('Send deletion notification error:', error)
  }
}
