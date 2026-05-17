import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 生成随机旅人ID（6位数字）
async function generateUniqueTravelerId(): Promise<string> {
  let travelerId: string
  let exists = true

  while (exists) {
    // 生成6位随机数字（100000-999999）
    travelerId = Math.floor(100000 + Math.random() * 900000).toString()

    const existing = await prisma.travelerRecord.findFirst({
      where: { travelerId }
    })
    exists = !!existing
  }

  return travelerId!
}

// 生成随机称号
async function generateRandomTitle(): Promise<string> {
  const [adjectiveCount, nounCount] = await Promise.all([
    prisma.titleAdjective.count({ where: { isActive: true } }),
    prisma.titleNoun.count({ where: { isActive: true } })
  ])

  if (adjectiveCount === 0 || nounCount === 0) {
    return '神秘的旅人'
  }

  const adjectiveSkip = Math.floor(Math.random() * adjectiveCount)
  const nounSkip = Math.floor(Math.random() * nounCount)

  const [adjective, noun] = await Promise.all([
    prisma.titleAdjective.findFirst({
      where: { isActive: true },
      skip: adjectiveSkip
    }),
    prisma.titleNoun.findFirst({
      where: { isActive: true },
      skip: nounSkip
    })
  ])

  return `${adjective?.word || '神秘的'}${noun?.word || '旅人'}`
}

// 获取用户第一条公开消息的内容
async function getFirstPublicMessageContent(userId: string): Promise<string | null> {
  const messageSet = await prisma.messageSet.findFirst({
    where: {
      senderId: userId,
      isPublic: true,
      isDeleted: false
    },
    include: {
      messages: {
        orderBy: { order: 'asc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (!messageSet || messageSet.messages.length === 0) {
    return null
  }

  const msg = messageSet.messages[0]
  if (msg.type !== 'text') {
    return null
  }

  return msg.content
}

// 获取或创建用户的旅人录
export async function GET(request: NextRequest) {
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

    // 查找现有旅人录
    let record = await prisma.travelerRecord.findUnique({
      where: { userId: payload.userId }
    })

    // 如果不存在，自动创建
    if (!record) {
      const title = await generateRandomTitle()
      const messageContent = await getFirstPublicMessageContent(payload.userId)

      // 描述取第一条公开消息的前50字
      let description: string | null = null
      if (messageContent) {
        description = messageContent.length > 50 ? messageContent.slice(0, 50) + '...' : messageContent
      }

      record = await prisma.travelerRecord.create({
        data: {
          userId: payload.userId,
          title,
          description
        }
      })
    }

    // 如果用户开启了公开展示且还没有旅人ID，生成一个
    if (record.isPublic && !record.travelerId) {
      const travelerId = await generateUniqueTravelerId()
      record = await prisma.travelerRecord.update({
        where: { id: record.id },
        data: { travelerId }
      })
    }

    // 获取用户交互码
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { intercode: true }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        travelerId: record.travelerId,
        title: record.title, // 返回真实称号，用户可以修改
        description: record.description, // 返回真实描述，用户可以修改
        isPublic: record.isPublic,
        titleBanned: record.titleBanned,
        descBanned: record.descBanned,
        titleBanCount: record.titleBanCount,
        descBanCount: record.descBanCount,
        intercode: user?.intercode
      }
    })
  } catch (error) {
    console.error('Get traveler record error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 更新旅人录
export async function PUT(request: NextRequest) {
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
    const { title, description, isPublic } = body

    // 查找现有旅人录
    let record = await prisma.travelerRecord.findUnique({
      where: { userId: payload.userId }
    })

    if (!record) {
      return NextResponse.json({ error: '旅人录不存在' }, { status: 404 })
    }

    // 准备更新数据
    const updateData: any = {}

    // 称号（用户可修改，修改后自动解除封禁）
    if (title !== undefined && title.trim()) {
      const trimmedTitle = title.trim()
      if (trimmedTitle.length < 2 || trimmedTitle.length > 20) {
        return NextResponse.json({ error: '称号长度需要在2-20字之间' }, { status: 400 })
      }
      updateData.title = trimmedTitle
      updateData.titleBanned = false // 修改后自动解除封禁
    }

    // 描述（用户可修改，修改后自动解除封禁）
    if (description !== undefined) {
      if (description && description.length > 200) {
        return NextResponse.json({ error: '描述不能超过200字' }, { status: 400 })
      }
      updateData.description = description || null
      updateData.descBanned = false // 修改后自动解除封禁
    }

    // 是否公开
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic

      // 如果开启公开展示且还没有旅人ID，生成一个
      if (isPublic && !record.travelerId) {
        updateData.travelerId = await generateUniqueTravelerId()
      }
    }

    // 执行更新
    if (Object.keys(updateData).length > 0) {
      record = await prisma.travelerRecord.update({
        where: { id: record.id },
        data: updateData
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        title: record.title,
        description: record.description,
        isPublic: record.isPublic,
        titleBanned: record.titleBanned,
        descBanned: record.descBanned
      }
    })
  } catch (error) {
    console.error('Update traveler record error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
