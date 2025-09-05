// src/app/api/admin/login/route.ts（修改版）
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
// 1. 新增：生成随机token的工具函数（简单版，够用）
const generateSessionToken = () => {
  // 生成32位随机字符串（包含字母和数字）
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export async function POST(req: NextRequest) {
  try {
    const loginData = await req.json();
    const { username, password } = loginData;

    if (!username.trim() || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    // 2. 查询管理员时，新增返回 sessionToken 字段（后续要更新）
    const admin = await prisma.user.findUnique({
      where: {
        phone: username.trim(),
        role: "ADMIN",
      },
      select: { // 显式指定返回字段，包含 sessionToken
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        passwordHash: true,
        sessionToken: true, // 新增：获取现有token（没有则为null）
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "管理员不存在" }, { status: 401 });
    }

    const isPasswordCorrect = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    // 3. 新增：生成token并更新到数据库
    const sessionToken = generateSessionToken(); // 生成新token
    await prisma.user.update({ // 把token存到管理员的 sessionToken 字段
      where: { id: admin.id },
      data: { sessionToken: sessionToken },
    });

    // 4. 登录成功返回：新增 token 字段（给前端存储）
    return NextResponse.json(
      {
        message: "登录成功！",
        adminInfo: {
          id: admin.id,
          name: admin.name,
          phone: admin.phone,
          email: admin.email,
          role: admin.role,
          token: sessionToken, // 新增：返回token，前端要存起来
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("管理员登录失败：", error);
    return NextResponse.json({ error: "登录异常" }, { status: 500 });
  }
}