import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@prisma/client";
import { getAdminIdFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 格式化角色名称
const formatRoleName = (role: UserRole): string => {
  switch (role) {
    case UserRole.TEEN_VOLUNTEER: return "青少年志愿者";
    case UserRole.SOCIAL_VOLUNTEER: return "社会志愿者";
    case UserRole.UNI_VOLUNTEER: return "大学生志愿者";
    default: return "未知角色";
  }
};

// 计算单个时间段的时长（例如 "09:00-10:00" → 1小时）
const calculateTimeSlotHours = (timeSlot: string): number => {
  try {
    const [start, end] = timeSlot.split("-");
    if (!start || !end) return 0;

    const startHour = parseInt(start.split(":")[0]);
    const endHour = parseInt(end.split(":")[0]);

    if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) {
      return 0;
    }

    return endHour - startHour;
  } catch (error) {
    console.error("计算时间段时长错误:", error, "timeSlot:", timeSlot);
    return 0;
  }
};

// 计算志愿者总时长（基于CheckInRecord）
const calculateTotalHours = async (userId: string): Promise<number> => {
  // 查询所有有效打卡记录
  const checkIns = await prisma.checkInRecord.findMany({
    where: {
      userId,
      status: "CHECKED_OUT", // 仅统计已签退的记录
      activityReservation: {
        status: "COMPLETED" // 关联的活动报名必须是已完成状态
      }
    },
    include: {
      activityReservation: {
        select: {
          timeSlot: true
        }
      }
    }
  });

  // 累加所有有效记录的时长
  return checkIns.reduce((total, record) => {
    return total + calculateTimeSlotHours(record.activityReservation.timeSlot);
  }, 0);
};

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const adminId = await getAdminIdFromRequest(req);
    if (!adminId) {
      return NextResponse.json(
        { error: "未授权访问，仅管理员可查看" },
        { status: 401 }
      );
    }

    // 获取分页和搜索参数
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";

    // 安全处理分页参数
    const safePage = isNaN(page) ? 1 : page;
    const safePageSize = isNaN(pageSize) ? 10 : pageSize;
    const skip = (safePage - 1) * safePageSize;

    // 构建查询条件
    const where: any = {
      role: { in: [UserRole.TEEN_VOLUNTEER, UserRole.SOCIAL_VOLUNTEER, UserRole.UNI_VOLUNTEER] }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }

    // 查询志愿者列表和总数
    const [volunteers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true
        },
        skip,
        take: safePageSize,
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count({ where })
    ]);

    // 为每个志愿者计算总时长
    const volunteersWithHours = await Promise.all(
      volunteers.map(async (vol) => ({
        ...vol,
        totalHours: await calculateTotalHours(vol.id)
      }))
    );

    // 格式化响应数据
    return NextResponse.json({
      data: volunteersWithHours.map(vol => ({
        id: vol.id,
        name: vol.name,
        phone: vol.phone,
        email: vol.email || "未填写",
        role: vol.role,
        roleName: formatRoleName(vol.role),
        avatarUrl: vol.avatarUrl || "/default-avatar.png",
        createdAt: vol.createdAt.toLocaleString(),
        totalHours: parseFloat(vol.totalHours.toFixed(1)) // 保留一位小数
      })),
      pagination: {
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize)
      }
    });

  } catch (error) {
    console.error("志愿者列表查询错误:", error);
    return NextResponse.json(
      { error: "获取志愿者列表失败，请稍后重试" },
      { status: 500 }
    );
  }
}
    