// src/app/components/HeaderCondition.tsx
"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header"; // 全局原始 Header

export default function HeaderCondition() {
  const pathname = usePathname();
  
  // 关键修改：添加 Admin 路由判断（/admin/* 也隐藏全局 Header）
  const isVolunteerOrAdminRoute = 
    pathname?.startsWith("/volunteer") ||  // 志愿者路由
    pathname?.startsWith("/admin");       // Admin 路由（新增）

  // 只有“非志愿者且非 Admin 路由”才显示全局 Header
  const shouldShowHeader = !isVolunteerOrAdminRoute;

  return shouldShowHeader ? <Header /> : null;
}