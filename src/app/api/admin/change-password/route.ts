import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader, hashPassword, comparePassword } from '@/lib/auth'

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
    const { oldPassword, newPassword } = body

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请输入旧密码和新密码' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少需要6个字符' }, { status: 400 })
    }

    // 查找管理员
    const admin = await prisma.admin.findUnique({
      where: { id: payload.userId }
    })

    if (!admin) {
      return NextResponse.json({ error: '管理员不存在' }, { status: 404 })
    }

    // 验证旧密码
    const validPassword = await comparePassword(oldPassword, admin.passwordHash)
    if (!validPassword) {
      return NextResponse.json({ error: '旧密码错误' }, { status: 400 })
    }

    // 更新密码
    const newPasswordHash = await hashPassword(newPassword)
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: newPasswordHash }
    })

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'change_password',
        details: '修改了登录密码'
      }
    })

    return NextResponse.json({
      success: true,
      data: { message: '密码修改成功' }
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: '修改失败' }, { status: 500 })
  }
}
