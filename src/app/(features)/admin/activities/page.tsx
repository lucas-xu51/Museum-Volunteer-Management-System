"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaChevronLeft, FaCalendarDay, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import { format, isValid } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

// 定义活动列表项类型（含报名统计）
interface AdminActivityItem {
  id: string;
  name: string;
  date: string; // UTC日期字符串
  dateStr: string; // 北京时间YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  totalReserved: number; // 总报名人数
  totalRequired: number; // 总需求人数
  remaining: number; // 剩余名额
}

export default function AdminActivitiesList() {
  const router = useRouter();
  const [activities, setActivities] = useState<AdminActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. 权限校验：仅管理员可访问
  useEffect(() => {
    const checkAdminPermission = () => {
      const adminInfoStr = localStorage.getItem("adminInfo");
      if (!adminInfoStr) {
        router.push("/admin/login");
        return;
      }
      const adminInfo = JSON.parse(adminInfoStr);
      // 仅允许ADMIN/UNI_ADMIN访问
      if (!["ADMIN", "UNI_ADMIN"].includes(adminInfo.role) || !adminInfo.token) {
        localStorage.removeItem("adminInfo");
        router.push("/admin/login");
      }
    };
    checkAdminPermission();
  }, [router]);

  // 2. 获取所有活动列表（含报名统计）
  useEffect(() => {
    const fetchAllActivities = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const adminInfo = JSON.parse(localStorage.getItem("adminInfo") || "{}");
        const response = await fetch("/api/admin/activities", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminInfo.token}`
          }
        });

        if (!response.ok) {
          const err = await response.json();
          if (response.status === 401) {
            localStorage.removeItem("adminInfo");
            router.push("/admin/login");
          }
          throw new Error(err.error || "获取活动列表失败");
        }

        const data: AdminActivityItem[] = await response.json();
        setActivities(data);
      } catch (error) {
        setErrorMsg((error as Error).message || "加载活动失败，请刷新重试");
        console.error("获取活动列表失败：", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllActivities();
  }, [router]);

  // 格式化日期显示
  const formatActivityDate = (dateStr: string) => {
    if (!dateStr || !isValid(new Date(dateStr))) return "日期未知";
    return format(new Date(dateStr), "yyyy年MM月dd日 EEEE", { locale: zhCN });
  };

  // 跳转到活动详情页
  const goToActivityDetail = (activityId: string) => {
    router.push(`/admin/activities/${activityId}`);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载活动列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push("/admin/positions")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-2"
          >
            <FaChevronLeft className="h-5 w-5" />
            <span>返回岗位日历</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800">所有活动管理</h1>
          <p className="text-gray-500 text-sm mt-1">共{activities.length}个活动，点击活动查看人员报名详情</p>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 错误提示 */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 16a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 活动列表表格 */}
        {activities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-2">暂无活动数据</h3>
            <p className="text-gray-400">请先创建活动后查看</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      活动名称
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      活动日期
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      活动时间
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      活动地点
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      报名进度
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr 
                      key={activity.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => goToActivityDetail(activity.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <FaCalendarDay className="h-4 w-4 text-blue-500" />
                          {formatActivityDate(activity.dateStr)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <FaClock className="h-4 w-4 text-gray-500" />
                          {activity.startTime} - {activity.endTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <FaMapMarkerAlt className="h-4 w-4 text-gray-500" />
                          {activity.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{activity.totalReserved}</span>/
                            <span className="text-gray-500">{activity.totalRequired}</span>人
                          </div>
                          {/* 进度条 */}
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${Math.min(100, (activity.totalReserved / activity.totalRequired) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          onClick={(e) => {
                            e.stopPropagation(); // 防止触发tr的点击事件
                            goToActivityDetail(activity.id);
                          }}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}