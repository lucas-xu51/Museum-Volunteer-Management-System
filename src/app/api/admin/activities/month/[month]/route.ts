import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 常量：北京时间与 UTC 时差（毫秒）
const BEIJING_UTC_OFFSET = 8 * 60 * 60 * 1000;

// 工具函数：计算北京时间的月度查询范围（保留，确保日期正确）
const getBeijingMonthRange = (month: string) => {
  const [year, monthNum] = month.split("-").map(Number);
  const beijingStart = new Date(year, monthNum - 1, 1, 0, 0, 0);
  const utcStart = new Date(beijingStart.getTime() - BEIJING_UTC_OFFSET);
  const beijingEnd = new Date(year, monthNum, 0, 23, 59, 59);
  const utcEnd = new Date(beijingEnd.getTime() - BEIJING_UTC_OFFSET);
  return { start: utcStart, end: utcEnd };
};

// 工具函数：UTC 时间转北京时间 YYYY-MM-DD（保留，确保日期匹配）
const formatBeijingDate = (utcDate: Date) => {
  const beijingTime = new Date(utcDate.getTime() + BEIJING_UTC_OFFSET);
  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, "0");
  const day = String(beijingTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET(
  request: Request,
  { params }: { params: { month: string } }
) {
  try {
    const { month } = params;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "月份格式错误，需为 YYYY-MM 格式（如 2025-08）" },
        { status: 400 }
      );
    }

    const { start: utcStart, end: utcEnd } = getBeijingMonthRange(month);

    // 1. 查询时仅获取 name 和 date（替换原 description）
    const monthActivities = await prisma.activity.findMany({
    where: { date: { gte: utcStart, lte: utcEnd } },
    select: {
        name: true, // 仅获取活动名称（核心）
        date: true  // 用于日期分组
    },
    orderBy: [{ date: "asc" }]
    });

    // 2. 分组时拼接 name 作为描述（替换原 description）
    const dailyActivities = monthActivities.reduce((acc, activity) => {
    const activityDate = formatBeijingDate(activity.date);
    if (!acc[activityDate]) {
        acc[activityDate] = {
        date: activityDate,
        count: 1,
        description: activity.name // 用名称作为描述
        };
    } else {
        acc[activityDate].count += 1;
        acc[activityDate].description += `、${activity.name}`; // 多个名称用“、”分隔
    }
    return acc;
    }, {} as Record<string, { date: string; count: number; description: string }>);

    return NextResponse.json(dailyActivities, { status: 200 });
  } catch (error) {
    console.error("按月份查询活动失败：", error);
    return NextResponse.json(
      { error: "获取月度活动失败，请重试" },
      { status: 500 }
    );
  }
}