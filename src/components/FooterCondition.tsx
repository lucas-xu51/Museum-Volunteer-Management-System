"use client"; // 客户端组件，确保 usePathname 正常使用

import { usePathname } from "next/navigation";
import GlobalFooter from "@/components/Footer"; // 全局通用 Footer
// 按需导入专属 Footer（若后续创建，取消注释即可）
// import VolunteerFooter from "@/components/VolunteerFooter"; // 志愿者专属 Footer
// import AdminFooter from "@/components/AdminFooter"; // Admin 专属 Footer

export default function FooterCondition() {
  const pathname = usePathname();
  if (!pathname) return null; // 路由未加载时返回空，避免异常

  // 1. 定义各路由类型（扩展方便，后续新增路由直接加条件）
  const isVolunteerRoute = pathname.startsWith("/volunteer"); // 志愿者路由
  const isAdminRoute = pathname.startsWith("/admin"); // Admin 路由（关键：此路由不显示 Footer）
  // const isOtherSpecialRoute = pathname.startsWith("/xxx"); // 其他特殊路由（按需加）

  // 2. 路由匹配逻辑（按优先级排序，特殊路由优先于全局）
  // 关键修改：Admin 路由直接返回 null，不渲染任何 Footer
  if (isAdminRoute) {
    return null; 
  }

  if (isVolunteerRoute) {
    // 志愿者路由：返回专属 Footer（若无专属，仍用全局）
    // return <VolunteerFooter />; // 有专属 Footer 时启用
    return <GlobalFooter />; // 无专属时，统一用全局 Footer
  }

  // 3. 所有非特殊路由（非 Admin、非 Volunteer）：显示全局 Footer
  return <GlobalFooter />;
}