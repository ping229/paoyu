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
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    let { userId, recordId } = body

    // 如果提供了recordId但没有userId，通过旅人录查找userId
    if (!userId && recordId) {
      const record = await prisma.travelerRecord.findUnique({
        where: { id: recordId },
        select: { userId: true }
      })
      if (record) {
        userId = record.userId
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    // 检查有效举报数量
    const validReports = await prisma.report.count({
      where: {
        reportedId: userId,
        status: 'valid'
      }
    })

    if (validReports < 3) {
      return NextResponse.json({
        error: `有效举报不足3次（当前${validReports}次）`
      }, { status: 400 })
    }

    // 删除用户（级联删除所有关联数据）
    await prisma.user.delete({
      where: { id: userId }
    })

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: payload.userId,
        action: 'ban_user',
        targetId: userId,
        details: '封禁用户，有效举报次数：' + validReports
      }
    })

    return NextResponse.json({
      success: true,
      data: { banned: true }
    })
  } catch (error) {
    console.error('Ban user error:', error)
    return NextResponse.json({ error: '封禁失败' }, { status: 500 })
  }
}
