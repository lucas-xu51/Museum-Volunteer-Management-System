// @/app/api/volunteer/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth"; // 导入你的中间件
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // 1. 调用你的中间件验证token，获取志愿者ID
    const volunteerId = await getVolunteerIdFromRequest(req);
    
    // 2. 验证失败：返回401未授权
    if (!volunteerId) {
      return NextResponse.json(
        { error: "未授权访问（令牌无效或未登录）" },
        { status: 401 }
      );
    }

    // 3. 验证成功：查询该志愿者的完整信息（不含敏感字段）
    const volunteer = await prisma.user.findUnique({
      where: { id: volunteerId },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        // 只返回前端需要的字段，排除 passwordHash/sessionToken 等敏感信息
      },
    });

    // 4. 返回用户信息给前端（匹配前端 Dashboard 组件的预期格式）
    return NextResponse.json(
      { userInfo: volunteer },
      { status: 200 }
    );

  } catch (error) {
    console.error("Dashboard接口错误：", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}