import { NextResponse, NextRequest } from "next/server"; // 新增导入 NextRequest
import prisma from "@/lib/prisma";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth";

// 显式定义活动详情类型（解决 positionConfigs 类型推断问题）
interface ActivityDetail {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  description: string | null;
  createdAt: Date;
  positionConfigs: {
    id: string;
    count: number;
    position: {
      id: string;
      name: string;
      description: string | null;
      allowedVolunteerTypes: string[]; // 匹配 Prisma 的 VolunteerType 枚举
      genderRestriction: string; // 匹配 Prisma 的 GenderRestriction 枚举
      minAge: number | null;
      maxAge: number | null;
    };
  }[];
}

// 关键修改1：将 request 类型从 Request 改为 NextRequest
export async function GET(
  request: NextRequest, // 这里修改：Request → NextRequest
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;
    if (!activityId) {
      return NextResponse.json({ error: "活动ID缺失" }, { status: 400 });
    }

    // 1. 校验志愿者身份（此时参数类型匹配，无报错）
    const volunteerId = await getVolunteerIdFromRequest(request);
    if (!volunteerId) {
      return NextResponse.json(
        { error: "请先以志愿者身份登录" },
        { status: 401 }
      );
    }

    // 2. 查询活动完整信息（含岗位配置）
    // 关键修改2：显式类型断言，解决 positionConfigs 类型提示问题
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        description: true, // 完整描述
        createdAt: true,
        positionConfigs: {
          select: {
            id: true,
            count: true, // 每小时需求人数
            position: {
              select: {
                id: true,
                name: true,
                description: true, // 岗位详细描述
                allowedVolunteerTypes: true, // 允许的志愿者类型
                genderRestriction: true, // 性别限制
                minAge: true,
                maxAge: true
              }
            }
          }
        }
      }
    }) as ActivityDetail | null; // 断言为定义的 ActivityDetail 类型

    if (!activity) {
      return NextResponse.json({ error: "活动不存在或已删除" }, { status: 404 });
    }

    // 3. 拆分小时级时间段（核心逻辑：如09:00-11:00 → ["09:00-10:00", "10:00-11:00"]）
    const startHour = parseInt(activity.startTime.split(":")[0]);
    const endHour = parseInt(activity.endTime.split(":")[0]);
    const timeSlots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      const nextHour = h + 1;
      timeSlots.push(`${String(h).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`);
    }

    // 4. 查询当前志愿者已报名的时间段（用于前端高亮已报名项）
    const myReservations = await prisma.activityReservation.findMany({
      where: {
        userId: volunteerId,
        activityId,
        status: "RESERVED" // 仅查询有效报名
      },
      select: {
        timeSlot: true,
        activityPositionId: true // 已报名的岗位配置ID
      }
    });

    // 5. 格式化返回数据
    return NextResponse.json({
      ...activity,
      dateStr: activity.date.toISOString().split("T")[0], // 格式化日期为YYYY-MM-DD
      timeSlots, // 拆分后的小时时间段
      myReservations: myReservations.map(res => ({
        timeSlot: res.timeSlot,
        positionConfigId: res.activityPositionId
      })),
      // 格式化岗位配置（添加是否允许当前志愿者报名的判断）
      positions: activity.positionConfigs.map(config => ({
        ...config,
        position: {
          ...config.position,
          // 简化志愿者类型判断（实际项目需根据志愿者信息动态判断）
          isAllowed: true
        }
      }))
    });
  } catch (error) {
    console.error("获取活动详情失败：", error);
    return NextResponse.json(
      { error: "服务器错误，获取活动详情失败" },
      { status: 500 }
    );
  }
}