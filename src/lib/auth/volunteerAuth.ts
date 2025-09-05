import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// 定义志愿者角色（与登录后端一致）
const VOLUNTEER_ROLES: UserRole[] = ["TEEN_VOLUNTEER", "SOCIAL_VOLUNTEER", "UNI_VOLUNTEER"];

/**
 * 从请求头中提取令牌，验证志愿者身份，返回志愿者ID（用于接口权限控制）
 * @param request Next.js 请求对象
 * @returns 志愿者ID（验证成功）/ null（验证失败）
 */
export async function getVolunteerIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // 1. 从请求头提取令牌（前端需携带 Authorization: Bearer {token}）
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null; // 无令牌或格式错误
    }
    const sessionToken = authHeader.split(" ")[1]; // 提取 Bearer 后的令牌

    // 2. 数据库验证：查询令牌对应的志愿者（需是志愿者角色，且令牌有效）
    const volunteer = await prisma.user.findFirst({
      where: {
        sessionToken, // 匹配存储的令牌
        role: { in: VOLUNTEER_ROLES }, // 确保是志愿者角色
      },
      select: { id: true }, // 仅返回ID，避免敏感信息泄露
    });

    // 3. 验证通过返回ID，失败返回null
    return volunteer ? volunteer.id : null;
  } catch (error) {
    console.error("志愿者身份验证失败：", error);
    return null;
  }
}

/**
 * 前端工具：检查 localStorage 中是否有有效的志愿者登录状态
 * @returns 登录状态（true/false）
 */
export function isVolunteerLoggedIn(): boolean {
  const volunteerInfo = localStorage.getItem("volunteerInfo");
  if (!volunteerInfo) return false;
  
  const { sessionToken, role } = JSON.parse(volunteerInfo);
  // 验证：有令牌 + 角色是志愿者
  return !!sessionToken && VOLUNTEER_ROLES.includes(role as UserRole);
}