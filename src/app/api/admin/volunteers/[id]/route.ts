import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAdminIdFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 复用计算时间段时长的函数
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

// 计算志愿者总时长
const calculateTotalHours = async (userId: string): Promise<number> => {
  const checkIns = await prisma.checkInRecord.findMany({
    where: {
      userId,
      status: "CHECKED_OUT",
      activityReservation: {
        status: "COMPLETED"
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

  return checkIns.reduce((total, record) => {
    return total + calculateTimeSlotHours(record.activityReservation.timeSlot);
  }, 0);
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const adminId = await getAdminIdFromRequest(req);
    if (!adminId) {
      return NextResponse.json(
        { error: "未授权访问，仅管理员可查看" },
        { status: 401 }
      );
    }

    const volunteerId = params.id;
    
    // 查询志愿者基本信息
    const volunteer = await prisma.user.findUnique({
      where: { id: volunteerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        approvedApplications: {
          take: 1,
          select: {
            applyType: true,
            applicantAge: true,
            applicantGender: true,
            applyTime: true,
            reviewTime: true
          }
        },
        activityReservations: {
          where: {
            status: "COMPLETED",
            checkInRecord: {
              status: "CHECKED_OUT"
            }
          },
          select: {
            id: true,
            timeSlot: true,
            reserveTime: true,
            activity: {
              select: {
                name: true,
                date: true,
                location: true
              }
            },
            positionConfig: {
              select: {
                position: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          take: 10,
          orderBy: { reserveTime: "desc" }
        }
      }
    });

    if (!volunteer) {
      return NextResponse.json(
        { error: "未找到该志愿者" },
        { status: 404 }
      );
    }

    // 计算总时长
    const totalHours = await calculateTotalHours(volunteerId);

    // 处理角色名称
    const roleNameMap: Record<string, string> = {
      "TEEN_VOLUNTEER": "青少年志愿者",
      "SOCIAL_VOLUNTEER": "社会志愿者",
      "UNI_VOLUNTEER": "大学生志愿者"
    };
    const roleName = roleNameMap[volunteer.role] || "未知角色";

    // 处理申请信息
    const applicationInfo = volunteer.approvedApplications[0] || {};

    // 处理近期活动记录
    const recentActivities = volunteer.activityReservations.length > 0 
      ? volunteer.activityReservations.map(res => ({
          id: res.id,
          activityName: res.activity.name || "未知活动",
          positionName: res.positionConfig.position.name || "未知岗位",
          date: res.activity.date.toLocaleDateString(),
          timeSlot: res.timeSlot,
          location: res.activity.location || "未填写",
          status: "COMPLETED"
        }))
      : [{
          id: "",
          activityName: "暂无活动记录",
          positionName: "暂无",
          date: "暂无",
          timeSlot: "暂无",
          location: "暂无",
          status: "COMPLETED"
        }];

    // 处理加入时间和最后活动时间
    const joinTime = volunteer.createdAt.toLocaleDateString();
    const lastActiveTime = volunteer.activityReservations.length > 0
      ? new Date(volunteer.activityReservations[0].reserveTime).toLocaleDateString()
      : "暂无";

    // 返回详情数据
    return NextResponse.json({
      data: {
        id: volunteer.id,
        name: volunteer.name,
        phone: volunteer.phone,
        email: volunteer.email || "未填写",
        role: volunteer.role,
        roleName,
        avatarUrl: volunteer.avatarUrl || "/default-avatar.png",
        joinTime,
        totalHours: parseFloat(totalHours.toFixed(1)),
        lastActiveTime,
        applicationInfo: {
          applyType: applicationInfo.applyType || "",
          applicantAge: applicationInfo.applicantAge || 0,
          applicantGender: applicationInfo.applicantGender || "未填写",
          applyTime: applicationInfo.applyTime?.toISOString() || "",
          reviewTime: applicationInfo.reviewTime?.toISOString() || ""
        },
        recentActivities
      }
    });

  } catch (error) {
    console.error("获取志愿者详情错误:", error);
    return NextResponse.json(
      { error: "获取志愿者详情失败，请稍后重试" },
      { status: 500 }
    );
  }
}
    