import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取名词列表
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

    const words = await prisma.titleNoun.findMany({
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: words
    })
  } catch (error) {
    console.error('Get nouns error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 添加名词
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
    const { word } = body

    if (!word || !word.trim()) {
      return NextResponse.json({ error: '词语不能为空' }, { status: 400 })
    }

    const trimmedWord = word.trim()

    // 检查是否已存在
    const existing = await prisma.titleNoun.findUnique({
      where: { word: trimmedWord }
    })

    if (existing) {
      return NextResponse.json({ error: '该词语已存在' }, { status: 400 })
    }

    const newWord = await prisma.titleNoun.create({
      data: { word: trimmedWord }
    })

    return NextResponse.json({
      success: true,
      data: newWord
    })
  } catch (error) {
    console.error('Add noun error:', error)
    return NextResponse.json({ error: '添加失败' }, { status: 500 })
  }
}

// 删除
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

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 })
    }

    await prisma.titleNoun.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '已删除'
    })
  } catch (error) {
    console.error('Delete noun error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}

// 切换启用状态
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
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 })
    }

    const updated = await prisma.titleNoun.update({
      where: { id },
      data: { isActive }
    })

    return NextResponse.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('Toggle noun error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
