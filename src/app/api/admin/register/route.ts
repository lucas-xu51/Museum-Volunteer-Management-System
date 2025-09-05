// src/app/api/admin/register/route.ts
// 管理员注册后端接口（测试阶段：直接创建 ADMIN 角色用户）
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // 引入封装的 Prisma Client
import bcrypt from "bcryptjs"; // 密码加密（需安装：npm install bcryptjs）

export async function POST(req: NextRequest) {
  try {
    // 1. 接收前端传递的管理员注册数据
    const formData = await req.json();
    const { name, phone, email, password, confirmPassword } = formData;

    // 2. 后端基础验证（测试阶段简化，保留核心校验）
    const errors: Record<string, string> = {};
    // 姓名校验
    if (!name.trim() || name.length < 2) {
      errors.name = "姓名不能为空且至少2个字符";
    }
    // 手机号校验（11位数字，唯一）
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phone.trim()) {
      errors.phone = "手机号不能为空";
    } else if (!phoneReg.test(phone.trim())) {
      errors.phone = "请输入有效的11位手机号";
    }
    // 邮箱校验（可选，但填写需符合格式）
    if (email && email.trim()) {
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(email.trim())) {
        errors.email = "请输入有效的邮箱地址";
      }
    }
    // 密码校验（至少6位，两次输入一致）
    if (!password) {
      errors.password = "密码不能为空";
    } else if (password.length < 6) {
      errors.password = "密码至少6个字符";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "两次输入的密码不一致";
    }

    // 3. 若有验证错误，返回给前端
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // 4. 密码加密（安全存储，测试阶段也需避免明文）
    const salt = await bcrypt.genSalt(10); // 加盐（提高安全性）
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. 核心逻辑：创建 ADMIN 角色的 User 记录
    const newAdmin = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null, // 邮箱可选，为空则存 null
        passwordHash: passwordHash, // 存储加密后的密码
        role: "ADMIN", // 直接设置为管理员角色（无需审核）
        createdAt: new Date(),
        updatedAt: new Date(),
        // 其他字段（如 avatarUrl、extraInfo）测试阶段可默认 null
      },
    });

    // 6. 返回注册成功结果（不返回敏感信息）
    return NextResponse.json(
      { 
        message: "管理员注册成功！可直接登录",
        adminId: newAdmin.id // 返回用户 ID（便于前端提示）
      }, 
      { status: 201 } // 201 表示资源创建成功
    );

  } catch (error) {
    console.error("管理员注册失败：", error);
    // 处理唯一约束错误（手机号/邮箱重复）
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint failed on the fields: (`phone`)")) {
        return NextResponse.json(
          { errors: { phone: "该手机号已注册过管理员" } },
          { status: 409 } // 409 表示冲突
        );
      }
      if (error.message.includes("Unique constraint failed on the fields: (`email`)")) {
        return NextResponse.json(
          { errors: { email: "该邮箱已注册过管理员" } },
          { status: 409 }
        );
      }
    }
    // 其他未知错误
    return NextResponse.json(
      { errors: { global: "注册失败，请稍后重试" } },
      { status: 500 }
    );
  }
}