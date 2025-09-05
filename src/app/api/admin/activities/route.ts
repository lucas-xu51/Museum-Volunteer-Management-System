import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminIdFromRequest } from '../../../../lib/auth';

// 1. 定义前端传递的活动数据类型（保留你原有的定义）
interface CreateActivityData {
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
  positions: { positionId: string; count: number }[];
}

export async function GET(request: NextRequest) {
  // 1. 验证管理员身份（必须登录且为管理员）
  const adminId = await getAdminIdFromRequest(request);
  if (!adminId) {
    return NextResponse.json(
      { error: '请先以管理员身份登录' }, 
      { status: 401 }
    );
  }

  // 2. 解析URL参数：支持按月份筛选（可选，与日历功能对齐）
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // 格式：YYYY-MM（如2025-08）

  try {
    // 构建查询条件（按月份筛选或查询所有）
    const whereCondition: any = {};
    if (month) {
      // 若传递了月份，查询该月的所有活动
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1); // 当月1号
      const endDate = new Date(year, monthNum, 0); // 当月最后一天
      whereCondition.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // 3. 查询活动主表 + 关联岗位配置 + 统计报名人数
    const activities = await prisma.activity.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        // 关联查询岗位配置（用于计算总需求人数）
        positionConfigs: {
          select: {
            count: true, // 每个岗位的每小时需求人数
          },
        },
        // 关联查询报名记录（用于统计总报名人数）
        reservations: {
          select: {
            id: true, // 仅需ID即可统计数量，无需完整字段
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }], // 按日期+时间排序
    });

    // 4. 格式化数据（计算总需求人数、总报名人数、北京时间dateStr）
    const formattedActivities = activities.map(activity => {
      // 计算总需求人数：所有岗位的「每小时需求人数 × 活动总小时数」之和
      const startHour = parseInt(activity.startTime.split(':')[0]);
      const endHour = parseInt(activity.endTime.split(':')[0]);
      const totalHours = endHour - startHour;
      const totalRequired = activity.positionConfigs.reduce(
        (sum, config) => sum + config.count * totalHours,
        0
      );

      // 计算总报名人数：报名记录的数量
      const totalReserved = activity.reservations.length;

      // 格式化北京时间dateStr（YYYY-MM-DD）
      const dateStr = new Date(activity.date.getTime() + 8 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      return {
        id: activity.id,
        name: activity.name,
        date: activity.date.toISOString(), // UTC日期（供前端参考）
        dateStr, // 北京时间日期（供前端显示）
        startTime: activity.startTime,
        endTime: activity.endTime,
        location: activity.location,
        totalRequired, // 总需求人数
        totalReserved, // 总报名人数
        remaining: totalRequired - totalReserved, // 剩余名额
      };
    });

    return NextResponse.json(formattedActivities, { status: 200 });
  } catch (error) {
    console.error('获取活动列表失败：', error);
    return NextResponse.json(
      { error: '服务器错误，获取活动列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminId = await getAdminIdFromRequest(request);
  if (!adminId) {
    return NextResponse.json(
      { error: '请先以管理员身份登录' }, 
      { status: 401 }
    );
  }

  const body: CreateActivityData = await request.json();
  const { name, date, startTime, endTime, location, positions } = body;

  if (!name || !date || !startTime || !endTime || !location || positions.length === 0) {
    return NextResponse.json({ error: '必填字段缺失（活动名称为必填项）' }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 });
  }

  try {
    const newActivity = await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          name,
          date: new Date(date),
          startTime,
          endTime,
          location,
          description: body.description || '',
          createdAtBy: adminId,
        },
      });

      await tx.activityPositionConfig.createMany({
        data: positions.map(config => ({
          activityId: activity.id,
          positionId: config.positionId,
          count: config.count,
        })),
      });

      return activity;
    });

    return NextResponse.json({ id: newActivity.id, message: '活动创建成功' }, { status: 201 });
  } catch (error) {
    console.error('创建活动失败：', error);
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: '同一时间同一地点的活动已存在' }, { status: 409 });
    }
    if ((error as any).code === 'P2003') {
      return NextResponse.json({ error: '管理员信息无效' }, { status: 400 });
    }
    return NextResponse.json({ error: '服务器错误，创建活动失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminId = await getAdminIdFromRequest(request);
  if (!adminId) {
    return NextResponse.json(
      { error: '请先以管理员身份登录' }, 
      { status: 401 }
    );
  }

  const body: CreateActivityData & { id: string } = await request.json();
  const { id, name, date, startTime, endTime, location, positions } = body;

  if (!name) {
    return NextResponse.json({ error: '活动名称为必填项' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activity.update({
        where: { id },
        data: { 
          name, 
          date: new Date(date), 
          startTime, 
          endTime, 
          location, 
          description: body.description || '' 
        },
      });

      await tx.activityPositionConfig.deleteMany({ where: { activityId: id } });
      await tx.activityPositionConfig.createMany({
        data: positions.map(config => ({
          activityId: id,
          positionId: config.positionId,
          count: config.count,
        })),
      });
    });

    return NextResponse.json({ message: '活动更新成功' });
  } catch (error) {
    console.error('更新活动失败：', error);
    return NextResponse.json({ error: '服务器错误，更新活动失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminId = await getAdminIdFromRequest(request);
  if (!adminId) {
    return NextResponse.json(
      { error: '请先以管理员身份登录' }, 
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get('id');

  if (!activityId) {
    return NextResponse.json({ error: '活动 ID 缺失' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activityPositionConfig.deleteMany({ where: { activityId } });
      await tx.activity.delete({ where: { id: activityId } });
    });

    return NextResponse.json({ message: '活动删除成功' });
  } catch (error) {
    console.error('删除活动失败：', error);
    return NextResponse.json({ error: '服务器错误，删除活动失败' }, { status: 500 });
  }
}