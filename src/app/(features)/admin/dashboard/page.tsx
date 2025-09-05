"use client";

import Link from "next/link";
import { 
  FaClipboardList, FaPlusCircle, FaCalendarAlt, 
  FaUsers, FaUserCog 
} from "react-icons/fa";
import type { AdminOverviewData } from "../layout";

// 仪表盘页面：通过 props 接收概览数据（普通组件形式）
interface AdminDashboardPageProps {
  overviewData: AdminOverviewData | null;
}

const AdminDashboardPage = ({ overviewData }: AdminDashboardPageProps) => {
  // 确保数据默认值安全
  const data = overviewData || {
    pendingApplications: 0,
    activePositions: 0,
    todaySchedules: 0,
    totalVolunteers: 0,
  };

  return (
    <div>
      {/* 数据概览区域 */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">数据概览</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 待审核申请卡片 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">待审核申请</p>
                <h3 className="text-3xl font-bold text-gray-900">{data.pendingApplications}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <FaClipboardList className="h-5 w-5" />
              </div>
            </div>
            <Link
              href="/admin/applications"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              查看详情 →
            </Link>
          </div>

          {/* 其他卡片内容保持不变 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">已发布岗位</p>
                <h3 className="text-3xl font-bold text-gray-900">{data.activePositions}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <FaPlusCircle className="h-5 w-5" />
              </div>
            </div>
            <Link
              href="/admin/positions"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              查看详情 →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">今日排班</p>
                <h3 className="text-3xl font-bold text-gray-900">{data.todaySchedules}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <FaCalendarAlt className="h-5 w-5" />
              </div>
            </div>
            <Link
              href="/admin/schedules"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              查看详情 →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">总志愿者</p>
                <h3 className="text-3xl font-bold text-gray-900">{data.totalVolunteers}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <FaUsers className="h-5 w-5" />
              </div>
            </div>
            <Link
              href="/admin/volunteers"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              查看详情 →
            </Link>
          </div>
        </div>
      </section>

      {/* 功能导航区域（保持不变） */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">功能导航</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/applications"
            className="bg-white rounded-xl shadow-md p-8 border border-gray-100 hover:shadow-lg transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0">
                <FaClipboardList className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">志愿者申请管理</h3>
                <p className="text-gray-600">查看所有申请记录，审核待处理申请</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/positions"
            className="bg-white rounded-xl shadow-md p-8 border border-gray-100 hover:shadow-lg transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <FaPlusCircle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">岗位与排班管理</h3>
                <p className="text-gray-600">发布岗位，创建每日排班计划</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/volunteers"
            className="bg-white rounded-xl shadow-md p-8 border border-gray-100 hover:shadow-lg transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                <FaUsers className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">志愿者管理</h3>
                <p className="text-gray-600">查看志愿者信息，管理服务时长</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white rounded-xl shadow-md p-8 border border-gray-100 hover:shadow-lg transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <FaUserCog className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">系统设置</h3>
                <p className="text-gray-600">修改密码，更新博物馆基础信息</p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;