import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// 允许的图片类型及其魔数（文件头）
const ALLOWED_IMAGE_TYPES: Record<string, { mime: string; magic: Buffer }> = {
  jpg: { mime: 'image/jpeg', magic: Buffer.from([0xFF, 0xD8, 0xFF]) },
  png: { mime: 'image/png', magic: Buffer.from([0x89, 0x50, 0x4E, 0x47]) },
  gif: { mime: 'image/gif', magic: Buffer.from([0x47, 0x49, 0x46, 0x38]) },
  webp: { mime: 'image/webp', magic: Buffer.from([0x52, 0x49, 0x46, 0x46]) },
}

// 验证文件是否为真实图片
function isValidImageFile(buffer: Buffer): string | null {
  for (const [ext, config] of Object.entries(ALLOWED_IMAGE_TYPES)) {
    if (buffer.length >= config.magic.length) {
      const header = buffer.slice(0, config.magic.length)
      if (header.equals(config.magic)) {
        return ext
      }
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: '登录已过期'
      }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        success: false,
        error: '请选择文件'
      }, { status: 400 })
    }

    // 验证文件类型（MIME类型）
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: '只支持 JPG, PNG, GIF, WebP 格式的图片'
      }, { status: 400 })
    }

    // 验证文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: '图片大小不能超过5MB'
      }, { status: 400 })
    }

    // 读取文件内容并验证文件头
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const actualExt = isValidImageFile(buffer)
    if (!actualExt) {
      return NextResponse.json({
        success: false,
        error: '文件内容无效，请上传真实的图片文件'
      }, { status: 400 })
    }

    // 生成安全的文件名（使用验证后的扩展名）
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${actualExt}`

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'uploads', 'images')
    await mkdir(uploadDir, { recursive: true })

    // 保存文件
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/images/${fileName}`,
        type: 'image'
      }
    })
  } catch (error) {
    console.error('Upload image error:', error)
    return NextResponse.json({
      success: false,
      error: '上传失败'
    }, { status: 500 })
  }
}
