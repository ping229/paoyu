import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取所有 AI 配置
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

    const configs = await prisma.aIConfig.findMany({
      orderBy: { priority: 'asc' }
    })

    // 获取总开关状态
    const toggleConfig = await prisma.systemConfig.findUnique({
      where: { key: 'ai_reply_enabled' }
    })

    return NextResponse.json({
      success: true,
      data: {
        configs,
        enabled: toggleConfig?.value === 'true'
      }
    })
  } catch (error) {
    console.error('Get AI configs error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 创建或更新 AI 配置
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
    const { id, name, apiUrl, apiKey, model, maxTokens, temperature, systemPrompt, isActive, priority } = body

    if (!name || !apiUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请填写必要字段' }, { status: 400 })
    }

    let config

    if (id) {
      // 更新
      config = await prisma.aIConfig.update({
        where: { id },
        data: {
          name,
          apiUrl,
          apiKey,
          model,
          maxTokens: maxTokens || 500,
          temperature: temperature || 0.7,
          systemPrompt: systemPrompt || null,
          isActive: isActive !== undefined ? isActive : true,
          priority: priority || 0
        }
      })
    } else {
      // 创建
      config = await prisma.aIConfig.create({
        data: {
          name,
          apiUrl,
          apiKey,
          model,
          maxTokens: maxTokens || 500,
          temperature: temperature || 0.7,
          systemPrompt: systemPrompt || null,
          isActive: isActive !== undefined ? isActive : true,
          priority: priority || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Save AI config error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}

// 删除 AI 配置
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
      return NextResponse.json({ error: '缺少配置ID' }, { status: 400 })
    }

    await prisma.aIConfig.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete AI config error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
