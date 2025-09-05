import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, CheckInStatus, ReservationStatus } from "@prisma/client";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 验证志愿者身份
    const volunteerId = await getVolunteerIdFromRequest(req);
    if (!volunteerId) {
      return NextResponse.json(
        { error: "未授权访问，请先登录" },
        { status: 401 }
      );
    }

    // 2. 解析请求体（保持与前端一致的参数名）
    const body = await req.json();
    const { timeSlot, positionConfigId, checkInTime, checkOutTime } = body;
    const activityId = params.id; // 从URL参数获取活动ID

    // 3. 参数校验（确保关键参数非空）
    if (!timeSlot || !positionConfigId || !checkInTime || !checkOutTime) {
      return NextResponse.json(
        { error: "时间段、岗位配置ID、打卡时间、签退时间不能为空" },
        { status: 400 }
      );
    }

    // 4. 关键校验：验证志愿者确实报名了该活动的该岗位+时间段
    const reservation = await prisma.activityReservation.findUnique({
      where: {
        // 使用ActivityReservation的联合唯一索引进行精准查询
        userId_activityId_timeSlot_activityPositionId: {
          userId: volunteerId,
          activityId,
          timeSlot,
          activityPositionId: positionConfigId
        }
      },
      // 关联查询岗位配置和活动信息（后续计算时长和校验用）
      include: {
        positionConfig: {
          include: {
            position: true // 关联基础岗位信息（可选，若后续需要岗位详情）
          }
        },
        activity: {
          select: { date: true } // 仅获取活动日期（可选，用于日志或扩展）
        }
      }
    });

    // 4.1 若未找到报名记录，返回403禁止访问
    if (!reservation) {
      return NextResponse.json(
        { error: "您未报名该时间段的岗位，无法打卡" },
        { status: 403 }
      );
    }

    // 4.2 若报名记录已取消，也禁止打卡
    if (reservation.status === "CANCELLED") {
      return NextResponse.json(
        { error: "您已取消该岗位的报名，无法打卡" },
        { status: 403 }
      );
    }

    // 5. 检查是否已打卡（避免重复打卡）
    // 关键修改：通过activityReservationId关联，而非scheduleId
    const existingCheckIn = await prisma.checkInRecord.findFirst({
      where: {
        userId: volunteerId,
        activityReservationId: reservation.id // 关联报名记录ID
      }
    });

    if (existingCheckIn) {
      return NextResponse.json(
        { error: "您已完成该时间段的打卡，无需重复操作" },
        { status: 400 }
      );
    }

    // 6. 计算志愿服务时长（与原逻辑一致：按时间段小时差计算）
    const [startHourStr] = timeSlot.split("-"); // 从"07:00-08:00"提取"07:00"
    const [endHourStr] = timeSlot.split("-")[1].split(":"); // 提取"08"
    const startHour = parseInt(startHourStr.split(":")[0]); // 转为数字7
    const endHour = parseInt(endHourStr); // 转为数字8
    const hours = endHour - startHour; // 计算时长（1小时）

    // 7. 创建打卡记录（核心修改：关联activityReservationId，移除scheduleId）
    const checkInRecord = await prisma.checkInRecord.create({
      data: {
        userId: volunteerId,
        activityReservationId: reservation.id, // 关联报名记录（关键）
        checkInTime: new Date(checkInTime), // 前端传递的打卡时间
        checkOutTime: new Date(checkOutTime), // 前端传递的签退时间（已默认延后1小时）
        checkedBy: volunteerId, // 测试阶段：自己审核
        status: CheckInStatus.CHECKED_OUT, // 测试阶段：直接标记为已签退
        // 移除scheduleId字段（因不再依赖DailySchedule）
      },
      // 关联查询，返回完整信息给前端
      include: {
        activityReservation: {
          include: {
            positionConfig: {
              include: {
                position: {
                  select: { name: true } // 返回岗位名称，便于前端展示
                }
              }
            }
          }
        }
      }
    });

    // 8. 更新志愿者总时长（与原逻辑一致，使用upsert避免重复创建）
    await prisma.volunteerHour.upsert({
      where: { userId: volunteerId },
      update: {
        totalHours: { increment: hours }, // 累加时长
        lastUpdateTime: new Date() // 更新最后修改时间
      },
      create: {
        userId: volunteerId,
        totalHours: hours, // 首次打卡：初始化为当前时长
        lastUpdateTime: new Date()
      }
    });

    // 9. 可选：更新ActivityReservation状态为"已完成"（标记报名已兑现）
    await prisma.activityReservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.COMPLETED }
    });

    // 10. 返回成功响应给前端
    return NextResponse.json({
      success: true,
      data: {
        checkInRecord,
        addedHours: hours // 额外返回本次增加的时长，便于前端展示
      }
    });

  } catch (error) {
    // 错误日志打印（便于排查问题）
    console.error("活动打卡接口错误：", {
      error: (error as Error).message,
      stack: (error as Error).stack,
      requestParams: {
        activityId: params.id,
        body: await req.json().catch(() => "解析失败")
      }
    });

    // 返回服务器错误
    return NextResponse.json(
      { error: "服务器错误，打卡失败，请稍后重试" },
      { status: 500 }
    );
  }
}
