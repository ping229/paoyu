import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; filename: string } }
) {
  try {
    const { type, filename } = params

    // 验证类型
    if (!['images', 'voices'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // 构建文件路径
    const filePath = path.join(process.cwd(), 'uploads', type, filename)

    // 读取文件
    const fileBuffer = await readFile(filePath)

    // 确定Content-Type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      webm: 'audio/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4'
    }

    const contentType = contentTypes[ext || ''] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('Serve file error:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
