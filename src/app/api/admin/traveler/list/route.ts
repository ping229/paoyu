import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取所有旅人录列表（管理员）
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
    const search = searchParams.get('search') || ''
    const limit = 30
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { travelerId: { contains: search } },
        { user: { intercode: { contains: search.toUpperCase() } } }
      ]
    }

    const [records, total] = await Promise.all([
      prisma.travelerRecord.findMany({
        where,
        include: {
          user: {
            select: {
              intercode: true,
              isBanned: true
            }
          },
          banHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10 // 只取最近10条
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.travelerRecord.count({ where })
    ])

    // 格式化返回数据（不包含真码）
    const result = records.map(record => ({
      id: record.id,
      travelerId: record.travelerId,
      intercode: record.user.intercode,
      title: record.title,
      description: record.description,
      isPublic: record.isPublic,
      titleBanned: record.titleBanned,
      descBanned: record.descBanned,
      titleBanCount: record.titleBanCount,
      descBanCount: record.descBanCount,
      isUserBanned: record.user.isBanned,
      banHistory: record.banHistory.map(h => ({
        id: h.id,
        banType: h.banType,
        originalContent: h.originalContent,
        createdAt: h.createdAt
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        records: result,
        page,
        totalPages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    console.error('Get admin traveler list error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
