"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCalendarDay, FaMapMarkerAlt, FaClock, FaChevronRight } from "react-icons/fa";
import { format, isValid } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

interface ActivityItem {
  id: string;
  name: string;
  date: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  totalHours: number;
  positions: {
    positionName: string;
    hourlyCount: number;
    totalCount: number;
  }[];
}

export default function VolunteerEventsPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  // 权限校验
  useEffect(() => {
    const checkPermission = () => {
      const userInfoStr = localStorage.getItem("volunteerInfo");
      if (!userInfoStr) {
        router.push("/volunteer/login");
        return;
      }
      try {
        const { role, sessionToken } = JSON.parse(userInfoStr);
        const volunteerRoles = ["TEEN_VOLUNTEER", "SOCIAL_VOLUNTEER", "UNI_VOLUNTEER"];
        if (!volunteerRoles.includes(role) || !sessionToken) {
          localStorage.removeItem("volunteerInfo");
          router.push("/volunteer/login");
        }
      } catch (err) {
        localStorage.removeItem("volunteerInfo");
        router.push("/volunteer/login");
      }
    };
    checkPermission();
  }, [router]);

  // 获取活动列表
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const userInfoStr = localStorage.getItem("volunteerInfo");
        if (!userInfoStr) {
          router.push("/volunteer/login");
          return;
        }
        const { sessionToken } = JSON.parse(userInfoStr);
        if (!sessionToken) {
          setErrorMsg("登录信息不完整，请重新登录");
          localStorage.removeItem("volunteerInfo");
          router.push("/volunteer/login");
          return;
        }

        const response = await fetch("/api/volunteer/activities", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`
          }
        });

        if (!response.ok) {
          const err = await response.json();
          if (response.status === 401) {
            localStorage.removeItem("volunteerInfo");
            router.push("/volunteer/login");
          }
          throw new Error(err.error || "获取活动列表失败");
        }

        const apiData: ActivityItem[] = await response.json();
        const validActivities = apiData.map((activity: ActivityItem) => {
          if (!activity.dateStr || activity.dateStr.trim() === "" || !isValid(new Date(`${activity.dateStr}T00:00:00+08:00`))) {
            const beijingToday = new Date();
            beijingToday.setTime(beijingToday.getTime() + 8 * 60 * 60 * 1000);
            const fallbackDateStr = beijingToday.toLocaleDateString("zh-CN", {
              timeZone: "Asia/Shanghai",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).replace(/\//g, "-");
            return { ...activity, dateStr: fallbackDateStr };
          }
          return activity;
        });

        setActivities(validActivities);
        setFilteredActivities(validActivities);
      } catch (error) {
        setErrorMsg((error as Error).message || "加载活动失败，请刷新页面");
        console.error("获取活动列表失败：", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [router]);

  // 日期筛选
  useEffect(() => {
    setFilteredActivities(
      selectedDate 
        ? activities.filter(activity => activity.dateStr === selectedDate) 
        : activities
    );
  }, [selectedDate, activities]);

  // 日期格式化
  const formatActivityDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== "string") return "日期未知";
    let beijingDate = new Date(`${dateStr}T00:00:00+08:00`);
    beijingDate.setTime(beijingDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (!isValid(beijingDate)) {
      const normalized = dateStr.replace(/\//g, "-").replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      let normalizedDate = new Date(`${normalized}T00:00:00+08:00`);
      normalizedDate.setTime(normalizedDate.getTime() + 24 * 60 * 60 * 1000);
      if (!isValid(normalizedDate)) return "日期格式错误";
      return format(normalizedDate, "yyyy年MM月dd日 EEEE", { locale: zhCN });
    }
    return format(beijingDate, "yyyy年MM月dd日 EEEE", { locale: zhCN });
  };

  // 跳转详情页
  const goToActivityDetail = (activityId: string) => {
    router.push(`/volunteer/events/${activityId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部：宽度固定为 max-w-7xl，与内容区对齐 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* 左侧：返回按钮 + 标题（新增返回按钮） */}
          <div className="flex items-center gap-3">
            {/* 返回按钮：点击返回上一页，hover有颜色过渡和图标偏移 */}
            <button
              onClick={() => router.push("/volunteer/dashboard")}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-all duration-200"
              aria-label="返回上一页"
            >
              {/* 左箭头图标，hover时轻微左移，增强交互感 */}
              <svg
                className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </button>
            {/* 原有标题，与返回按钮横向对齐 */}
            <h1 className="text-xl font-bold text-gray-800">志愿者活动中心</h1>
          </div>

          {/* 右侧：日期选择器 + 我的报名（保持不变） */}
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => router.push("/volunteer/reservations")}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              我的报名
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区：核心优化——固定外层宽度，所有状态共用同一框架 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 错误提示：宽度随外层 max-w-7xl 固定 */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 16a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 标题栏：宽度固定，与下方内容区对齐 */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">
            可报名活动（{filteredActivities.length}个）
          </h2>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              清除筛选
            </button>
          )}
        </div>

        {/* 关键：固定宽度的外层容器——所有状态（加载/无活动/有活动）都在这个容器内 */}
        {/* 用 grid 布局保证“列数结构”固定，即使无活动也不改变外层宽度 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* 1. 加载中状态：生成与“有活动”相同数量的占位卡片，宽度完全对齐 */}
          {isLoading ? (
            // 生成 3 个占位卡片（与 lg:grid-cols-3 匹配，确保宽度一致）
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 animate-pulse">
                {/* 模拟卡片顶部的蓝色日期栏 */}
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                {/* 模拟活动名称 */}
                <div className="h-7 bg-gray-200 rounded w-full mb-4"></div>
                {/* 模拟时间栏 */}
                <div className="h-4 bg-gray-200 rounded w-40 mb-4"></div>
                {/* 模拟岗位需求 */}
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
                {/* 模拟描述 */}
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
                {/* 模拟查看详情按钮 */}
                <div className="h-5 bg-gray-200 rounded w-20 ml-auto"></div>
              </div>
            ))
          ) : (
            // 2. 非加载状态：无活动/有活动共用同一 grid 列结构
            filteredActivities.length === 0 ? (
              // 无活动状态：用 col-span-full 占满所有列，但外层 grid 框架不变（宽度固定）
              <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-8 flex flex-col items-center justify-center text-center">
                {/* 图标+文字居中，不拉伸外层容器 */}
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-500 mb-2">暂无可报名的活动</h3>
                <p className="text-gray-400 max-w-md mb-6">请稍后刷新页面，或通过顶部日期选择器查看其他日期的活动</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  刷新活动列表
                </button>
              </div>
            ) : (
              // 有活动状态：卡片按 grid 列数排列，宽度与占位卡片完全一致
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => goToActivityDetail(activity.id)}
                >
                  <div className="bg-blue-50 px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                      <FaCalendarDay className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">{formatActivityDate(activity.dateStr)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <FaMapMarkerAlt className="h-4 w-4 text-gray-500" />
                      <span>{activity.location}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 line-clamp-1">
                      {activity.name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                      <FaClock className="h-4 w-4 text-gray-500" />
                      <span>{activity.startTime} - {activity.endTime}（{activity.totalHours}小时）</span>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">岗位需求：</p>
                      <div className="flex flex-wrap gap-2">
                        {activity.positions.map((pos, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {pos.positionName}：{pos.hourlyCount}人/小时（共{pos.totalCount}人）
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {activity.description || "暂无活动描述"}
                    </p>

                    <div className="flex justify-end">
                      <button
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToActivityDetail(activity.id);
                        }}
                      >
                        查看详情
                        <FaChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </main>
    </div>
  );
}