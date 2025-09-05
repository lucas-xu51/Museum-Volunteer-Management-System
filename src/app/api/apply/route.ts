// src/app/api/apply/route.ts（完全适配新数据库结构）
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { VolunteerType } from "@prisma/client";

// 处理 POST 请求（仅创建申请表记录，不创建 User）
export async function POST(req: NextRequest) {
  try {
    // 1. 接收客户端传递的表单数据（字段与前端一致，无需修改）
    const formData = await req.json();
    const { name, gender, phone, email, age, volunteerType } = formData;

    // 2. 后端二次验证（逻辑不变，确保数据合法）
    if (!name.trim() || name.length < 2) {
      return NextResponse.json(
        { error: "姓名不能为空且至少2个字符" },
        { status: 400 }
      );
    }
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phone.trim() || !phoneReg.test(phone.trim())) {
      return NextResponse.json(
        { error: "请输入有效的11位手机号" },
        { status: 400 }
      );
    }
    if (age < 12 || age > 65) {
      return NextResponse.json(
        { error: "年龄需在12-65岁之间" },
        { status: 400 }
      );
    }
    if (email && email.trim()) {
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(email.trim())) {
        return NextResponse.json(
          { error: "请输入有效的邮箱地址" },
          { status: 400 }
        );
      }
    }

    // 3. 核心修改：仅创建 VolunteerApplication 记录（使用新表的临时字段）
    await prisma.volunteerApplication.create({
      data: {
        // 映射表单数据到申请表的临时字段（新 Schema 新增的字段）
        applicantName: name.trim(),    // 申请人姓名
        applicantPhone: phone.trim(),  // 申请人电话（唯一，防重复申请）
        applicantEmail: email?.trim() || null, // 申请人邮箱（可选）
        applicantAge: age,             // 申请人年龄（数字类型）
        applicantGender: gender,       // 申请人性别（男/女/其他）
        applyType: volunteerType as VolunteerType, // 申请类型（枚举匹配）
        status: "PENDING",             // 初始状态：待审核
        applyTime: new Date(),         // 申请时间
        // 以下字段无需填充（审核后才赋值）：userId/reviewBy/reviewNote/reviewTime
      },
    });

    // 4. 返回成功结果（提示文案不变，用户无感知）
    return NextResponse.json(
      { message: "申请提交成功！我们将在3个工作日内通知您" },
      { status: 200 }
    );

  } catch (error) {
    console.error("后端申请处理失败：", error);
    // 关键修改：匹配新表的“手机号唯一”约束（applicantPhone 字段）
    if (error instanceof Error && error.message.includes("Unique constraint failed on the fields: (`applicantPhone`)")) {
      return NextResponse.json(
        { error: "该手机号已提交过申请" },
        { status: 409 } // 409 表示冲突
      );
    }
    // 其他未知错误
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}