import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { ApplicationStatus } from "@prisma/client";

// 获取所有志愿者申请（支持按状态筛选）
export async function GET(req: NextRequest) {
  try {
    // 从查询参数获取筛选条件（默认显示待审核）
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") as ApplicationStatus | null;
    
    // 构建查询条件
    const where = status ? { status } : {};
    
    // 查询申请列表（按申请时间倒序）
    const applications = await prisma.volunteerApplication.findMany({
      where,
      orderBy: { applyTime: "desc" },
      include: {
        reviewer: {
          select: { id: true, name: true } // 关联查询审核人信息
        }
      }
    });

    return NextResponse.json(applications, { status: 200 });
  } catch (error) {
    console.error("获取申请列表失败：", error);
    return NextResponse.json(
      { error: "获取申请列表异常，请稍后重试" },
      { status: 500 }
    );
  }
}
