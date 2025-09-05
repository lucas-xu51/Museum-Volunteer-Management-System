"use client";

// 统一导入React相关依赖
import React, { useState, useEffect, ReactNode, ReactElement } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaSignOutAlt } from "react-icons/fa";
import prisma from "@/lib/prisma";

export type AdminOverviewData = {
  pendingApplications: number;
  activePositions: number;
  todaySchedules: number;
  totalVolunteers: number;
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 判断当前是否是登录页面
  const isLoginPage = pathname === "/admin/login";

  // 1. 登录状态验证
  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    const verifyAdminLogin = () => {
      const storedAdmin = localStorage.getItem("adminInfo");
      if (!storedAdmin) {
        router.push("/admin/login");
        return null;
      }
      return JSON.parse(storedAdmin);
    };

    const adminData = verifyAdminLogin();
    if (adminData) {
      setAdminInfo(adminData);
    } else {
      setIsLoading(false);
    }
  }, [router, pathname, isLoginPage]);

  // 2. 获取概览数据
  useEffect(() => {
    if (isLoginPage || !adminInfo) return;

    const fetchOverviewData = async () => {
      try {
        setIsLoading(true);
        const [pendingApps, activePositions, todaySchedules, totalVolunteers] =
          await prisma.$transaction([
            prisma.volunteerApplication.count({ where: { status: "PENDING" } }),
            prisma.volunteerPosition.count({ where: { isActive: true } }),
            prisma.dailySchedule.count({ where: { date: new Date(new Date().toDateString()) } }),
            prisma.user.count({
              where: { role: { in: ["TEEN_VOLUNTEER", "SOCIAL_VOLUNTEER", "UNI_VOLUNTEER"] } },
            }),
          ]);

        setOverviewData({
          pendingApplications: pendingApps,
          activePositions,
          todaySchedules,
          totalVolunteers,
        });
      } catch (error) {
        console.error("获取 Admin 概览数据失败：", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (pathname === "/admin/dashboard") {
      fetchOverviewData();
    } else {
      setIsLoading(false);
    }
  }, [adminInfo, pathname, isLoginPage]);

  // 3. 退出登录
  const handleLogout = () => {
    localStorage.removeItem("adminInfo");
    router.push("/");
  };

  // 加载中状态
  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 登录页面直接渲染
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 非登录页面：未登录不渲染
  if (!adminInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white shadow-md z-30 sticky top-0">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-blue-700">管理员中心</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 text-sm hidden md:inline-block">
              欢迎，{adminInfo.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition-colors"
              aria-label="退出登录"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span className="text-sm hidden sm:inline-block">退出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 - 子页面将在这里渲染 */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* 给仪表盘页面传递概览数据 */}
        {pathname === "/admin/dashboard" && React.isValidElement(children)
          ? React.cloneElement(children as ReactElement, {
              overviewData: overviewData,
            })
          : children
        }
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} 博物馆志愿者管理系统 | 管理员后台
        </div>
      </footer>
    </div>
  );
}
