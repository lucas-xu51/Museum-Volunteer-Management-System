// src/app/api/admin/activities/[date]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: 获取指定日期的所有活动（含岗位配置）
export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  const { date } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '日期格式错误' }, { status: 400 });
  }

  // 2. 查询当日活动（关联岗位配置和岗位信息）
  try {
    const activities = await prisma.activity.findMany({
      where: { date: new Date(date) },
      include: {
        positionConfigs: {
          include: {
            position: { select: { id: true, name: true } }, // 关联岗位名称
          },
        },
      },
      orderBy: { startTime: 'asc' }, // 按开始时间排序
    });

    // 3. 格式化数据（适配前端 Activity 类型，新增name字段）
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      name: activity.name, // 新增：返回活动名称
      date: date, // 前端需要 YYYY-MM-DD 格式
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location,
      description: activity.description,
      // 格式化岗位配置（匹配前端 ActivityPositionConfig 类型）
      positions: activity.positionConfigs.map(config => ({
        positionId: config.positionId,
        positionName: config.position.name,
        count: config.count,
      })),
    }));

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('获取当日活动失败：', error);
    return NextResponse.json(
      { error: '服务器错误，获取活动失败' },
      { status: 500 }
    );
  }
}
    