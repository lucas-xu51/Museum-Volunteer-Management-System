import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth";

export async function GET(
  request: NextRequest,  // 修改：将 Request 改为 NextRequest
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;
    const { searchParams } = new URL(request.url);
    const timeSlot = searchParams.get("timeSlot"); // 如"09:00-10:00"
    const positionConfigId = searchParams.get("positionConfigId"); // 岗位配置ID

    if (!timeSlot || !positionConfigId) {
      return NextResponse.json({ error: "时间段或岗位ID缺失" }, { status: 400 });
    }

    // 校验志愿者身份（现在参数类型匹配）
    const volunteerId = await getVolunteerIdFromRequest(request);
    if (!volunteerId) {
      return NextResponse.json(
        { error: "请先以志愿者身份登录" },
        { status: 401 }
      );
    }

    // 1. 查询该时间段该岗位的已报名人数
    const reservedCount = await prisma.activityReservation.count({
      where: {
        activityId,
        timeSlot,
        activityPositionId: positionConfigId,
        status: "RESERVED"
      }
    });

    // 2. 查询该岗位的每小时需求人数
    const positionConfig = await prisma.activityPositionConfig.findUnique({
      where: { id: positionConfigId },
      select: { count: true }
    });

    if (!positionConfig) {
      return NextResponse.json({ error: "岗位配置不存在" }, { status: 404 });
    }

    // 3. 返回结果（已报名人数、剩余名额）
    return NextResponse.json({
      reservedCount,
      totalCount: positionConfig.count, // 每小时需求人数
      remainingCount: positionConfig.count - reservedCount // 剩余名额
    });
  } catch (error) {
    console.error("查询报名情况失败：", error);
    return NextResponse.json(
      { error: "服务器错误，查询报名情况失败" },
      { status: 500 }
    );
  }
}
