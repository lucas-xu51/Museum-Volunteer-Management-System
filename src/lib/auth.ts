// src/lib/auth.ts（修复后）
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function getAdminIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // 1. 提取认证头，判断格式是否正确
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('认证头缺失或格式错误');
      return null; // 直接返回 null，不进入查询
    }

    // 2. 提取 token（确保不会是 null）
    const token = authHeader.slice(7).trim(); // 用 trim() 去除空字符串
    if (!token) { // 若 token 为空字符串，也直接返回 null
      console.log('token 为空');
      return null;
    }

    // 3. Prisma 查询：此时 token 必然是非空 string，符合类型要求
    const admin = await prisma.user.findFirst({
      where: {
        sessionToken: token, // ✅ 此时 token 是 string，无类型错误
        role: 'ADMIN', // 与你的登录逻辑一致，只查询 ADMIN 角色
        // id: { not: null } // 确保管理员 ID 有效
      },
      select: { id: true } // 只返回需要的 ID 字段
    });

    // 4. 返回结果：有管理员则返回 ID，否则返回 null
    return admin?.id || null;

  } catch (error) {
    console.error('认证工具出错：', error);
    return null;
  }
}