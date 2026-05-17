import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取公开的旅人录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 30
    const skip = (page - 1) * limit

    // 获取公开且未被完全封禁的旅人录
    const records = await prisma.travelerRecord.findMany({
      where: {
        isPublic: true
      },
      include: {
        user: {
          select: {
            intercode: true,
            isBanned: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    })

    // 过滤掉被封禁的用户
    const filteredRecords = records.filter(r => !r.user.isBanned)

    // 格式化返回数据
    const result = filteredRecords.map(record => ({
      id: record.id,
      travelerId: record.travelerId,
      title: record.titleBanned ? '管理员已封禁该称号' : record.title,
      description: record.descBanned ? '管理员已置空该描述' : record.description,
      intercode: record.user.intercode,
      userId: record.userId, // 真码，用于发送泡泡
      hasValidTitle: !record.titleBanned,
      hasValidDesc: !record.descBanned && !!record.description
    }))

    // 获取总数
    const total = await prisma.travelerRecord.count({
      where: {
        isPublic: true,
        user: { isBanned: false }
      }
    })

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
    console.error('Get gathering list error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
