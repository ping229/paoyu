import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

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

    const reports = await prisma.report.findMany({
      where: { status: 'pending' },
      include: {
        messageSet: {
          include: {
            messages: {
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 获取被举报者的当前交互码
    const reportsWithIntercode = await Promise.all(
      reports.map(async (report) => {
        const reportedUser = await prisma.user.findUnique({
          where: { id: report.reportedId },
          select: { intercode: true }
        })
        return {
          ...report,
          reportedIntercode: reportedUser?.intercode || '已注销'
        }
      })
    )

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: payload.userId,
        action: 'view_reports',
        details: `查看了 ${reports.length} 条待处理举报`
      }
    })

    return NextResponse.json({
      success: true,
      data: reportsWithIntercode
    })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

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
    const { reportId, status } = body

    if (!reportId || !['valid', 'invalid'].includes(status)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status }
    })

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: payload.userId,
        action: 'handle_report',
        targetId: reportId,
        details: `将举报标记为${status === 'valid' ? '有效' : '无效'}`
      }
    })

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Handle report error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
