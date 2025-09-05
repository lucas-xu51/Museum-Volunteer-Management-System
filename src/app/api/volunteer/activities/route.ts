import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getVolunteerIdFromRequest } from "@/lib/auth/volunteerAuth";

// 🌟 关键工具函数：将UTC时间转为北京时间的YYYY-MM-DD字符串（无任何偏差）
const utcToBeijingDateStr = (utcDate: Date | string): string => {
  const date = new Date(utcDate);
  // 直接用北京时区生成日期字符串，避免toISOString的UTC转换
  return date.toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai", // 强制指定北京时区
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "-"); // 统一分隔符为"-"（如2025/08/30 → 2025-08-30）
};

interface ActivityWithPositions {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  description: string | null;
  positionConfigs: {
    id: string;
    count: number;
    position: {
      id: string;
      name: string;
    }
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // 1. 校验志愿者身份
    const volunteerId = await getVolunteerIdFromRequest(request);
    if (!volunteerId) {
      return NextResponse.json(
        { error: "请先以志愿者身份登录" },
        { status: 401 }
      );
    }

    // 2. 基于UTC时间查询（数据库存储的是UTC时间，避免时区混淆）
    const now = new Date();
    // UTC今天0点（用于筛选今天及以后的活动）
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // UTC明天0点（用于区分今天和未来）
    const utcTomorrow = new Date(utcToday);
    utcTomorrow.setUTCDate(utcTomorrow.getUTCDate() + 1);

    // 当前北京时间（HH:MM）：UTC时间+8小时
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentBeijingTime = beijingNow.toTimeString().slice(0, 5);

    // 3. 查询符合条件的活动（今天未结束 + 未来活动）
    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          // 条件1：未来活动（UTC日期在明天及以后）
          { date: { gte: utcTomorrow } },
          // 条件2：今天活动（UTC今天）且结束时间在当前北京时间之后（未结束）
          {
            date: { gte: utcToday, lt: utcTomorrow },
            endTime: { gt: currentBeijingTime }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        description: true,
        positionConfigs: {
          select: {
            id: true,
            count: true,
            position: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }]
    }) as ActivityWithPositions[];

    // 4. 格式化数据（关键：生成北京时间dateStr）
    const formattedActivities = activities.map(activity => {
      // 计算活动总小时数
      const startHour = parseInt(activity.startTime.split(":")[0]);
      const endHour = parseInt(activity.endTime.split(":")[0]);
      const totalHours = endHour - startHour;

      // 处理岗位数据
      const positions = activity.positionConfigs.map(config => ({
        positionName: config.position.name,
        hourlyCount: config.count,
        totalCount: config.count * totalHours
      }));

      return {
        id: activity.id,
        name: activity.name,
        date: activity.date.toISOString(), // 保留原始UTC时间（供参考）
        dateStr: utcToBeijingDateStr(activity.date), // 🌟 北京时间日期字符串
        startTime: activity.startTime,
        endTime: activity.endTime,
        location: activity.location,
        description: activity.description || "",
        totalHours,
        positions,
        positionConfigs: undefined // 移除无用字段
      };
    });

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error("获取活动列表失败：", error);
    return NextResponse.json(
      { error: "服务器错误，获取活动失败" },
      { status: 500 }
    );
  }
}