// src/app/api/admin/positions/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取 URL 中的岗位 ID（动态路由参数）
type Params = {
  params: { id: string };
};

// PUT 请求：编辑现有岗位
export async function PUT(request: Request, { params }: Params) {
  const { id } = params; // 从动态路由获取岗位 ID

  try {
    // 1. 解析请求体
    const body = await request.json();
    const {
      name,
      description,
      maxNum,
      isActive,
      allowedVolunteerTypes,
      genderRestriction,
      minAge,
      maxAge,
    } = body;

    // 2. 数据验证
    if (!name || maxNum < 1 || !allowedVolunteerTypes?.length) {
      return NextResponse.json(
        { error: "岗位名称、最大人数、允许类型为必填项，且最大人数不能小于1" },
        { status: 400 }
      );
    }
    if (minAge && maxAge && minAge > maxAge) {
      return NextResponse.json(
        { error: "最小年龄不能大于最大年龄" },
        { status: 400 }
      );
    }

    // 3. 先检查岗位是否存在（防止编辑不存在的岗位）
    const existingPosition = await prisma.volunteerPosition.findUnique({
      where: { id },
    });
    if (!existingPosition) {
      return NextResponse.json(
        { error: "该岗位不存在或已被删除" },
        { status: 404 } // 404 表示资源不存在
      );
    }

    // 4. 调用 Prisma 更新岗位
    const updatedPosition = await prisma.volunteerPosition.update({
      where: { id },
      data: {
        name,
        description: description || null,
        maxNum: maxNum ?? existingPosition.maxNum,
        isActive,
        allowedVolunteerTypes,
        genderRestriction,
        minAge: minAge || null,
        maxAge: maxAge || null,
      },
    });

    // 5. 返回更新后的岗位数据
    return NextResponse.json(updatedPosition, { status: 200 });
  } catch (error) {
    console.error(`编辑岗位 ${id} 失败：`, error);
    return NextResponse.json(
      { error: "编辑岗位失败，请重试" },
      { status: 500 }
    );
  }
}

// DELETE 请求：删除现有岗位（级联删除关联的排班）
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = params;

  try {
    // 1. 检查岗位是否存在
    const existingPosition = await prisma.volunteerPosition.findUnique({
      where: { id },
    });
    if (!existingPosition) {
      return NextResponse.json(
        { error: "该岗位不存在或已被删除" },
        { status: 404 }
      );
    }

    // 2. 删除岗位（Prisma 自动级联删除关联的 DailySchedule，因模型中配置了 onDelete: Cascade）
    await prisma.volunteerPosition.delete({
      where: { id },
    });

    // 3. 返回删除成功的提示
    return NextResponse.json(
      { message: "岗位删除成功" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`删除岗位 ${id} 失败：`, error);
    return NextResponse.json(
      { error: "删除岗位失败，请重试" },
      { status: 500 }
    );
  }
}