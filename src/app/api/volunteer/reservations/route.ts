import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 初始化 Prisma 客户端
const prisma = new PrismaClient();

// 定义响应数据类型（前端可复用）
export interface VolunteerReservationItem {
  id: string; // 报名记录ID
  activity: {
    id: string;
    name: string; // 活动名称
    date: string; // 活动日期（格式化后：YYYY年MM月DD日 星期X）
    startTime: string; // 活动开始时间（HH:00）
    endTime: string; // 活动结束时间（HH:00）
    location: string; // 活动地点
    description: string | null; // 活动描述
  };
  position: {
    id: string;
    name: string; // 岗位名称（如“引导员”“安全员”）
  };
  timeSlot: string; // 报名的小时段（如“09:00-10:00”）
  status: string; // 报名状态（RESERVED/CANCELLED/COMPLETED）
  reserveTime: string; // 报名时间（格式化后：YYYY-MM-DD HH:MM:SS）
  cancelTime: string | null; // 取消时间（null表示未取消）
}

// GET 请求：获取当前志愿者的全部报名记录
export async function GET(req: NextRequest) {
  try {
    // 1. 从请求头获取 Token，验证志愿者身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权访问：请先登录' },
        { status: 401 }
      );
    }
    const sessionToken = authHeader.split(' ')[1];

    // 2. 根据 Token 查询当前志愿者（User 表）
    const volunteer = await prisma.user.findUnique({
      where: { sessionToken },
      select: { id: true, role: true }, // 仅需用户ID和角色（验证是否为志愿者）
    });

    // 3. 验证志愿者身份（排除管理员角色）
    const volunteerRoles = ['TEEN_VOLUNTEER', 'SOCIAL_VOLUNTEER', 'UNI_VOLUNTEER'];
    if (!volunteer || !volunteerRoles.includes(volunteer.role)) {
      return NextResponse.json(
        { error: '权限不足：仅志愿者可访问' },
        { status: 403 }
      );
    }
    const userId = volunteer.id;

    // 4. 查询当前志愿者的全部活动报名记录（关联活动、岗位信息）
    const reservations = await prisma.activityReservation.findMany({
      where: { userId }, // 仅查询当前志愿者的报名
      orderBy: { reserveTime: 'desc' }, // 按报名时间倒序（最新的在前）
      include: {
        // 关联活动信息
        activity: {
          select: {
            id: true,
            name: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            description: true,
          },
        },
        // 关联岗位信息（通过 ActivityPositionConfig 间接关联）
        positionConfig: {
          include: {
            position: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // 5. 格式化数据（适配前端展示）
    const formattedReservations: VolunteerReservationItem[] = reservations.map(res => ({
      id: res.id,
      activity: {
        id: res.activity.id,
        name: res.activity.name,
        // 格式化日期：2024年05月20日 星期一
        date: format(new Date(res.activity.date), 'yyyy年MM月dd日 EEEE', { locale: zhCN }),
        startTime: res.activity.startTime,
        endTime: res.activity.endTime,
        location: res.activity.location,
        description: res.activity.description,
      },
      position: {
        id: res.positionConfig.position.id,
        name: res.positionConfig.position.name,
      },
      timeSlot: res.timeSlot,
      // 状态中文映射（前端更友好）
      status: res.status === 'RESERVED' 
        ? '已报名' 
        : res.status === 'CANCELLED' 
          ? '已取消' 
          : '已完成',
      // 格式化报名时间：2024-05-19 14:30:25
      reserveTime: format(new Date(res.reserveTime), 'yyyy-MM-dd HH:mm:ss'),
      // 格式化取消时间（若有）
      cancelTime: res.cancelTime 
        ? format(new Date(res.cancelTime), 'yyyy-MM-dd HH:mm:ss') 
        : null,
    }));

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      count: formattedReservations.length,
      data: formattedReservations,
    }, { status: 200 });

  } catch (error) {
    console.error('获取志愿者报名记录失败：', error);
    return NextResponse.json(
      { error: '服务器错误：获取报名记录失败' },
      { status: 500 }
    );
  } finally {
    // 关闭 Prisma 连接
    await prisma.$disconnect();
  }
}

// PATCH 请求：取消报名（可选功能，供前端调用）
export async function PATCH(req: NextRequest) {
  try {
    // 1. 验证身份（同 GET 逻辑）
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    const sessionToken = authHeader.split(' ')[1];
    const volunteer = await prisma.user.findUnique({
      where: { sessionToken },
      select: { id: true, role: true },
    });
    const volunteerRoles = ['TEEN_VOLUNTEER', 'SOCIAL_VOLUNTEER', 'UNI_VOLUNTEER'];
    if (!volunteer || !volunteerRoles.includes(volunteer.role)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 2. 获取请求体（报名记录ID）
    const { reservationId } = await req.json();
    if (!reservationId) {
      return NextResponse.json({ error: '缺少参数：报名记录ID' }, { status: 400 });
    }

    // 3. 验证报名记录归属（确保是当前志愿者的记录）
    const existingReservation = await prisma.activityReservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, status: true },
    });
    if (!existingReservation) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }
    if (existingReservation.userId !== volunteer.id) {
      return NextResponse.json({ error: '无权操作他人报名记录' }, { status: 403 });
    }
    if (existingReservation.status === 'CANCELLED' || existingReservation.status === 'COMPLETED') {
      return NextResponse.json({ error: '当前状态无法取消（已取消/已完成）' }, { status: 400 });
    }

    // 4. 更新报名状态为“已取消”
    const updatedReservation = await prisma.activityReservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
        cancelTime: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: '取消报名成功',
      data: { id: updatedReservation.id },
    }, { status: 200 });

  } catch (error) {
    console.error('取消报名失败：', error);
    return NextResponse.json({ error: '服务器错误：取消报名失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}