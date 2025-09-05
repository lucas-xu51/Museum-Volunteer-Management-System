import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { v4 as uuidv4 } from "uuid"; // 新增：用于生成唯一令牌（需安装依赖）

// 定义志愿者角色列表（排除 ADMIN/UNI_ADMIN）
const VOLUNTEER_ROLES: UserRole[] = ["TEEN_VOLUNTEER", "SOCIAL_VOLUNTEER", "UNI_VOLUNTEER"];

export async function POST(req: NextRequest) {
  try {
    // 1. 接收前端传递的登录数据（手机号+密码）
    const loginData = await req.json();
    const { phone, password } = loginData;

    // 2. 基础验证（非空校验）
    if (!phone.trim() || !password) {
      return NextResponse.json(
        { error: "手机号和密码不能为空" },
        { status: 400 }
      );
    }

    // 3. 验证手机号格式（11位数字）
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone.trim())) {
      return NextResponse.json(
        { error: "请输入有效的11位手机号" },
        { status: 400 }
      );
    }

    // 4. 核心逻辑1：查询数据库（手机号+志愿者角色）
    const volunteer = await prisma.user.findUnique({
      where: {
        phone: phone.trim(), // 匹配手机号（User 表中 phone 唯一）
        role: { in: VOLUNTEER_ROLES }, // 仅查询志愿者角色，排除管理员
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        passwordHash: true, // 仅查询密码哈希（用于比对）
        avatarUrl: true,
      },
    });

    // 5. 验证志愿者是否存在
    if (!volunteer) {
      return NextResponse.json(
        { error: "志愿者账号不存在，请先提交申请" },
        { status: 401 } // 401 未授权
      );
    }

    // 6. 核心逻辑2：比对密码（明文密码 vs 加密哈希）
    const isPasswordCorrect = await bcrypt.compare(password, volunteer.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "密码错误，请重新输入" },
        { status: 401 }
      );
    }

    // 🌟 新增：生成唯一会话令牌（UUID）
    const sessionToken = uuidv4(); // 如："1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
    
    // 🌟 新增：将令牌存储到 User 表的 sessionToken 字段（更新用户会话）
    await prisma.user.update({
      where: { id: volunteer.id },
      data: { sessionToken } // 存储令牌，用于后续身份验证
    });

    // 7. 登录成功：返回志愿者信息 + 令牌（隐藏敏感字段 passwordHash）
    const { passwordHash, ...volunteerInfo } = volunteer; // 剔除密码哈希
    return NextResponse.json(
      {
        message: "登录成功！",
        volunteerInfo, // 包含 id/name/phone/role 等核心信息
        sessionToken, // 🌟 新增：返回令牌给前端存储
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("志愿者登录失败：", error);
    return NextResponse.json(
      { error: "登录异常，请稍后重试" },
      { status: 500 }
    );
  }
}