import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth";

// 定义报名请求体类型
interface ReserveRequest {
  timeSlot: string; // 报名时间段
  positionConfigId: string; // 岗位配置ID
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;
    const body: ReserveRequest = await request.json();
    const { timeSlot, positionConfigId } = body;

    // 1. 校验参数
    if (!timeSlot || !positionConfigId) {
      return NextResponse.json({ error: "时间段或岗位ID缺失" }, { status: 400 });
    }

    // 2. 校验志愿者身份
    const volunteerId = await getVolunteerIdFromRequest(request);
    if (!volunteerId) {
      return NextResponse.json(
        { error: "请先以志愿者身份登录" },
        { status: 401 }
      );
    }

    // 3. 事务报名（避免超名额、重复报名）
    const result = await prisma.$transaction(async (tx) => {
      // ① 检查活动是否存在且未过期
      const activity = await tx.activity.findUnique({
        where: { id: activityId },
        select: { date: true, endTime: true }
      });
      if (!activity) {
        throw new Error("活动不存在或已删除");
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = activity.date < today || 
        (activity.date.getTime() === today.getTime() && 
         parseInt(activity.endTime.split(":")[0]) <= new Date().getHours());
      if (isExpired) {
        throw new Error("活动已过期，无法报名");
      }

      // ② 检查是否重复报名
      const existingReservation = await tx.activityReservation.findUnique({
        where: {
          userId_activityId_timeSlot_activityPositionId: {
            userId: volunteerId,
            activityId,
            timeSlot,
            activityPositionId: positionConfigId
          }
        }
      });
      if (existingReservation) {
        throw new Error("您已报名该时间段的该岗位，无需重复报名");
      }

      // ③ 检查名额是否充足
      const [positionConfig, reservedCount] = await Promise.all([
        tx.activityPositionConfig.findUnique({
          where: { id: positionConfigId },
          select: { count: true }
        }),
        tx.activityReservation.count({
          where: {
            activityId,
            timeSlot,
            activityPositionId: positionConfigId,
            status: "RESERVED"
          }
        })
      ]);
      if (!positionConfig) {
        throw new Error("岗位配置不存在");
      }
      if (reservedCount >= positionConfig.count) {
        throw new Error("该时间段的该岗位已报满，无法报名");
      }

      // ④ 创建报名记录
      const reservation = await tx.activityReservation.create({
        data: {
          userId: volunteerId,
          activityId,
          activityPositionId: positionConfigId,
          timeSlot,
          status: "RESERVED"
        },
        select: { id: true, reserveTime: true }
      });

      return reservation;
    });

    return NextResponse.json({
      message: "报名成功",
      reservationId: result.id,
      reserveTime: result.reserveTime
    }, { status: 201 });
  } catch (error) {
    console.error("活动报名失败：", error);
    return NextResponse.json(
      { error: (error as Error).message || "服务器错误，报名失败" },
      { status: 400 } // 业务错误返回400，方便前端提示
    );
  }
}