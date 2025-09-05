// src/app/api/admin/activities/[id]/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminIdFromRequest } from '../../../../../lib/auth';

// 1. 定义接口返回的类型（严格匹配 Prisma Schema）
interface ReservedVolunteer {
  id: string;
  name: string;
  phone: string;
  role: string;
  reserveTime: string;
}

interface PositionTimeSlot {
  positionId: string;
  positionName: string;
  timeSlot: string;
  reservedVolunteers: ReservedVolunteer[];
  totalRequired: number;
  remaining: number;
}

interface ActivityDetailResponse {
  id: string;
  name: string;
  date: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  timeSlots: string[];
  positionTimeSlots: PositionTimeSlot[];
  totalReserved: number;
  totalRequired: number;
}

// 2. 辅助函数：验证时间格式（HH:MM）
const isValidTimeFormat = (time: string): boolean => {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
};

// 3. GET 接口：获取单个活动详情（适配你的 Prisma Schema）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // 验证管理员身份
  const adminId = await getAdminIdFromRequest(request);
  if (!adminId) {
    return NextResponse.json(
      { error: '请先以管理员身份登录' },
      { status: 401 }
    );
  }

  const activityId = params.id;
  if (!activityId) {
    return NextResponse.json({ error: '活动ID缺失' }, { status: 400 });
  }

  try {
    // 4. 关键修复：显式 include 关联字段（positionConfigs + reservations）
    // 完全匹配你的 Prisma Schema 关联关系
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        // 关联 ActivityPositionConfig（活动-岗位配置），并包含 position 信息
        positionConfigs: {
          include: {
            position: true, // 关联 VolunteerPosition 模型
          },
        },
        // 关联 ActivityReservation（活动报名记录），并包含 volunteer 信息
        reservations: {
          include: {
            volunteer: true, // 关联 User 模型（报名的志愿者）
          },
        },
      },
    });

    // 活动不存在
    if (!activity) {
      return NextResponse.json({ error: '活动不存在或已删除' }, { status: 404 });
    }

    // 5. 日期有效性校验
    if (!(activity.date instanceof Date) || isNaN(activity.date.getTime())) {
      return NextResponse.json(
        { error: `活动日期格式错误：${activity.date}，请检查数据库` },
        { status: 400 }
      );
    }

    // 6. 时间格式校验（匹配你的 Schema 中 String 类型的 startTime/endTime）
    if (!isValidTimeFormat(activity.startTime)) {
      return NextResponse.json(
        { error: `开始时间格式错误（${activity.startTime}），需为 HH:MM 格式` },
        { status: 400 }
      );
    }
    if (!isValidTimeFormat(activity.endTime)) {
      return NextResponse.json(
        { error: `结束时间格式错误（${activity.endTime}），需为 HH:MM 格式` },
        { status: 400 }
      );
    }

    // 7. 计算活动总小时数（用于生成时间段）
    const startHour = parseInt(activity.startTime.split(':')[0], 10);
    const endHour = parseInt(activity.endTime.split(':')[0], 10);
    if (isNaN(startHour) || isNaN(endHour) || startHour < 0 || endHour > 23 || startHour >= endHour) {
      return NextResponse.json(
        { error: `时间范围无效：${activity.startTime}-${activity.endTime}，结束时间需晚于开始时间` },
        { status: 400 }
      );
    }
    const totalHours = endHour - startHour;

    // 8. 生成时间段（如 "09:00-10:00"）
    const timeSlots: string[] = [];
    for (let i = startHour; i < endHour; i++) {
      const currentHour = i.toString().padStart(2, '0');
      const nextHour = (i + 1).toString().padStart(2, '0');
      timeSlots.push(`${currentHour}:00-${nextHour}:00`);
    }

    // 9. 处理岗位-时间段报名数据（严格匹配你的 Schema 关联）
    const positionTimeSlots: PositionTimeSlot[] = [];
    // 遍历每个岗位配置（ActivityPositionConfig）
    activity.positionConfigs.forEach((config) => {
      // 每个岗位的每小时需求人数（来自 ActivityPositionConfig.count）
      const hourlyRequired = config.count;

      // 遍历每个时间段，匹配该岗位的报名记录
      timeSlots.forEach((timeSlot) => {
        // 筛选该岗位+该时间段的报名记录（ActivityReservation）
        const reservedRecords = activity.reservations.filter(
          (res) => res.activityPositionId === config.id && res.timeSlot === timeSlot
        );

        // 格式化报名志愿者信息（来自 User 模型）
        const reservedVolunteers: ReservedVolunteer[] = reservedRecords.map((res) => ({
          id: res.volunteer.id,
          name: res.volunteer.name,
          phone: res.volunteer.phone,
          role: res.volunteer.role, // 志愿者角色（如 TEEN_VOLUNTEER）
          reserveTime: res.reserveTime.toISOString(),
        }));

        // 组装岗位-时间段数据
        positionTimeSlots.push({
          positionId: config.position.id,
          positionName: config.position.name,
          timeSlot,
          reservedVolunteers,
          totalRequired: hourlyRequired, // 每小时需求人数
          remaining: hourlyRequired - reservedVolunteers.length, // 剩余名额
        });
      });
    });

    // 10. 计算总报名人数和总需求人数
    const totalReserved = activity.reservations.length;
    const totalRequired = activity.positionConfigs.reduce(
      (sum, config) => sum + config.count * totalHours, // 总需求 = 每小时需求 × 总小时数
      0
    );

    // 11. 格式化北京时间日期（UTC 转 北京时间）
    const dateStr = new Date(activity.date.getTime() + 8 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 12. 组装最终响应数据
    const responseData: ActivityDetailResponse = {
      id: activity.id,
      name: activity.name,
      date: activity.date.toISOString(), // UTC 日期（供参考）
      dateStr, // 北京时间日期（YYYY-MM-DD）
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location,
      description: activity.description || '',
      timeSlots,
      positionTimeSlots,
      totalReserved,
      totalRequired,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('获取活动详情失败：', error);
    return NextResponse.json(
      { error: '服务器错误，获取活动详情失败' },
      { status: 500 }
    );
  }
}