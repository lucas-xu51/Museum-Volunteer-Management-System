// src/app/api/admin/positions/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET 请求：获取所有志愿者岗位（按创建时间倒序）
export async function GET() {
  try {
    const positions = await prisma.volunteerPosition.findMany({
      orderBy: { createdAt: "desc" }, // 最新创建的岗位在前
    });

    // 返回岗位列表（200 成功）
    return NextResponse.json(positions, { status: 200 });
  } catch (error) {
    console.error("获取岗位列表失败：", error);
    // 返回错误信息（500 服务器错误）
    return NextResponse.json(
      { error: "获取岗位列表失败，请重试" },
      { status: 500 }
    );
  }
}

// POST 请求：添加新志愿者岗位
export async function POST(request: Request) {
  try {
    // 1. 解析请求体（前端传递的表单数据）
    const body = await request.json();
    const {
      name,
      description,
      maxNum = 1,
      isActive = true,
      allowedVolunteerTypes,
      genderRestriction = "UNRESTRICTED",
      minAge,
      maxAge,
    } = body;

    // 2. 基础数据验证（防止无效数据入库）
    if (!name || maxNum < 1 || !allowedVolunteerTypes?.length) {
      return NextResponse.json(
        { error: "岗位名称、最大人数、允许类型为必填项，且最大人数不能小于1" },
        { status: 400 } // 400 表示请求参数错误
      );
    }
    if (minAge && maxAge && minAge > maxAge) {
      return NextResponse.json(
        { error: "最小年龄不能大于最大年龄" },
        { status: 400 }
      );
    }

    // 3. 调用 Prisma 创建岗位（映射到数据库）
    const newPosition = await prisma.volunteerPosition.create({
      data: {
        name,
        description: description || null, // 可选字段，空值存为 null
        maxNum: maxNum,
        isActive,
        allowedVolunteerTypes, // 直接传递数组（Prisma 自动处理枚举类型）
        genderRestriction, // 枚举类型，确保与前端传递的值一致
        minAge: minAge || null, // 可选字段，空值存为 null
        maxAge: maxAge || null,
      },
    });

    // 4. 返回创建成功的岗位数据（201 表示创建成功）
    return NextResponse.json(newPosition, { status: 201 });
  } catch (error) {
    console.error("添加岗位失败：", error);
    return NextResponse.json(
      { error: "添加岗位失败，请重试" },
      { status: 500 }
    );
  }
}