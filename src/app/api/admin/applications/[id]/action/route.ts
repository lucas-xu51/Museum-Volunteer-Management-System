import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

import { UserRole } from "@prisma/client";

// 处理申请审核（同意/拒绝）
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id;
    const { action, reviewNote, adminId } = await req.json();

    // 验证参数
    if (!["approve", "reject"].includes(action) || !adminId) {
      return NextResponse.json(
        { error: "参数错误，请检查请求" },
        { status: 400 }
      );
    }

    // 开启事务：确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 查询申请是否存在
      const application = await tx.volunteerApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error("申请记录不存在");
      }

      // 2. 检查申请是否已处理
      if (application.status !== "PENDING") {
        throw new Error("该申请已处理，无需重复操作");
      }

      const now = new Date();

      if (action === "approve") {
        // 3. 同意申请：创建对应的User记录
        // 3.1 生成默认密码（手机号后6位，便于首次登录）
        const defaultPassword = application.applicantPhone.slice(-6);
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // 3.2 根据申请类型映射用户角色
        let userRole: UserRole;
        switch (application.applyType) {
          case "TEEN":
            userRole = "TEEN_VOLUNTEER";
            break;
          case "SOCIAL":
            userRole = "SOCIAL_VOLUNTEER";
            break;
          case "UNIVERSITY":
            userRole = "UNI_VOLUNTEER";
            break;
          default:
            throw new Error("申请类型不匹配");
        }

        // 3.3 创建用户
        const newUser = await tx.user.create({
          data: {
            name: application.applicantName,
            phone: application.applicantPhone,
            email: application.applicantEmail || null,
            passwordHash: passwordHash,
            role: userRole,
            createdAt: now,
            updatedAt: now,
          },
        });

        // 3.4 更新申请状态（关联用户ID和审核人）
        await tx.volunteerApplication.update({
          where: { id: applicationId },
          data: {
            status: "APPROVED",
            reviewBy: adminId,
            reviewNote: reviewNote || null,
            reviewTime: now,
            userId: newUser.id, // 关联到新创建的用户
          },
        });

        // 3.5 初始化志愿者时长记录
        await tx.volunteerHour.create({
          data: {
            userId: newUser.id,
            totalHours: 0,
            lastUpdateTime: now,
          },
        });

        return { 
          success: true, 
          message: "申请已批准，用户已创建",
          defaultPassword // 返回默认密码，便于管理员告知申请人
        };
      } else {
        // 4. 拒绝申请：仅更新状态
        await tx.volunteerApplication.update({
          where: { id: applicationId },
          data: {
            status: "REJECTED",
            reviewBy: adminId,
            reviewNote: reviewNote || null,
            reviewTime: now,
          },
        });

        return { 
          success: true, 
          message: "申请已拒绝"
        };
      }
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("处理申请失败：", error);
    const message = error instanceof Error ? error.message : "处理申请异常";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
