import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 使用你的验证工具获取志愿者ID
    const volunteerId = await getVolunteerIdFromRequest(req);
    if (!volunteerId) {
      return NextResponse.json(
        { error: "未授权访问，请先登录" },
        { status: 401 }
      );
    }

    // 2. 获取活动ID
    const activityId = params.id;
    if (!activityId) {
      return NextResponse.json(
        { error: "活动ID不能为空" },
        { status: 400 }
      );
    }

    // 3. 查询当前用户该活动的已打卡记录
    const checkInRecords = await prisma.checkInRecord.findMany({
      where: {
        userId: volunteerId, // 当前志愿者ID
        activityReservation: {
          activityId: activityId // 关联到活动
        }
      },
      include: {
        activityReservation: true
      }
    });

    // 4. 格式化返回数据
    const formattedRecords = checkInRecords
      .filter(record => record.activityReservation !== null)
      .map(record => ({
        id: record.id,
        timeSlot: record.activityReservation?.timeSlot ?? "",
        activityPositionId: record.activityReservation?.activityPositionId ?? "",
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime
      }));

    return NextResponse.json({ data: formattedRecords });
  } catch (error) {
    console.error("获取打卡记录失败：", error);
    return NextResponse.json(
      { error: "服务器错误，获取打卡记录失败" },
      { status: 500 }
    );
  }
}
