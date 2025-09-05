"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaChevronLeft, FaChevronRight, FaCog, FaList } from "react-icons/fa";

// 定义活动类型（仅保留必要字段）
interface DailyActivity {
  date: string; // 格式：YYYY-MM-DD
  description: string; // 核心：具体活动描述
}

// 生成指定年月的所有日期数据（原有逻辑不变）
const generateMonthDates = (year: number, month: number) => {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const lastMonthTotalDays = new Date(year, month, 0).getDate();
  const dates = [];

  // 填充上月最后几天
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    dates.push({
      date: lastMonthTotalDays - i,
      month: month - 1,
      year,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // 填充当月天数
  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;
  const isCurrentMonth = today.getMonth() === month;
  for (let i = 1; i <= totalDays; i++) {
    dates.push({
      date: i,
      month,
      year,
      isCurrentMonth: true,
      isToday: isCurrentYear && isCurrentMonth && today.getDate() === i,
    });
  }

  // 填充下月前几天（补满6行）
  const remainingDays = 42 - dates.length;
  for (let i = 1; i <= remainingDays; i++) {
    dates.push({
      date: i,
      month: month + 1,
      year,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return dates;
};

const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function AdminPositionsCalendar() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarDates, setCalendarDates] = useState(
    generateMonthDates(currentYear, currentMonth)
  );
  // 简化活动状态：仅保留日期和描述的映射
  const [monthActivities, setMonthActivities] = useState<Record<string, DailyActivity>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 获取认证头（原有逻辑不变）
  const getAuthHeaders = () => {
    const adminInfo = localStorage.getItem("adminInfo");
    const adminData = adminInfo ? JSON.parse(adminInfo) : null;
    const token = adminData?.token || "";
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  };

  // 切换月份时更新日历和活动数据
  useEffect(() => {
    setCalendarDates(generateMonthDates(currentYear, currentMonth));
    fetchMonthActivities();
  }, [currentYear, currentMonth]);

  // 获取月度活动数据（保持原有请求逻辑）
  const fetchMonthActivities = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const formattedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const response = await fetch(`/api/admin/activities/month/${formattedMonth}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "获取月度活动失败");
      }

      // 即使后端返回count，也仅提取date和description字段
      const rawData: Record<string, { date: string; count: number; description: string }> = await response.json();
      // 转换为简化格式：仅保留date和description
      const simplifiedData: Record<string, DailyActivity> = {};
      Object.keys(rawData).forEach(key => {
        simplifiedData[key] = {
          date: rawData[key].date,
          description: rawData[key].description
        };
      });
      setMonthActivities(simplifiedData);
    } catch (error) {
      console.error("获取月度活动失败:", error);
      setErrorMsg((error as Error).message || "加载活动失败，请刷新页面重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 上/下月切换（原有逻辑不变）
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // 点击日期跳转（原有逻辑不变）
  const handleDateClick = (date: { date: number; month: number; year: number }) => {
    const formattedYear = date.year;
    const formattedMonth = String(date.month + 1).padStart(2, "0");
    const formattedDay = String(date.date).padStart(2, "0");
    const formattedDate = `${formattedYear}-${formattedMonth}-${formattedDay}`;
    
    router.push(`/admin/positions/${formattedDate}`);
  };

  const formatMonth = (month: number) => {
    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    return monthNames[month];
  };

  // 生成北京时间格式的日期键（与后端匹配）
  const getBeijingDateKey = (date: { date: number; month: number; year: number }) => {
    const formattedYear = date.year;
    const formattedMonth = String(date.month + 1).padStart(2, "0");
    const formattedDay = String(date.date).padStart(2, "0");
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
  };

  // 获取当前日期的活动（仅返回描述相关数据）
  const getDateActivity = (date: { date: number; month: number; year: number }) => {
    const dateKey = getBeijingDateKey(date);
    return monthActivities[dateKey];
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页面标题与返回按钮 */}
      <header className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* 左侧：返回按钮 */}
          <button
            onClick={() => router.push("http://localhost:3000/admin/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="返回仪表盘"
          >
            <FaChevronLeft className="h-5 w-5" />
            <span>返回仪表盘</span>
          </button>

          {/* 中间：页面标题（居中显示） */}
          <h1 className="text-2xl font-bold text-gray-800 absolute left-1/2 transform -translate-x-1/2">
            岗位日历
          </h1>

          {/* 右侧：操作按钮组 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/activities")}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaList className="h-5 w-5" />
              <span>查看所有活动</span>
            </button>

            <button
              onClick={() => router.push("/admin/positions/settings")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaCog className="h-5 w-5" />
              <span>设置志愿者岗位</span>
            </button>
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 shadow-sm border border-red-100">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 16a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 日历容器 */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {/* 日历头部（年月切换） */}
        <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="hover:text-blue-100 transition-colors"
            aria-label="上一个月"
          >
            <FaChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-semibold">{currentYear}年 {formatMonth(currentMonth)}</h2>
          <button
            onClick={handleNextMonth}
            className="hover:text-blue-100 transition-colors"
            aria-label="下一个月"
          >
            <FaChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-4 text-center font-medium text-gray-600 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格（核心优化：仅显示活动描述） */}
        <div className="grid grid-cols-7">
          {calendarDates.map((date, index) => {
            const activity = getDateActivity(date);
            return (
              <div
                key={index}
                className={`
                  min-h-[140px] p-4 border-b border-r border-gray-100 
                  ${!date.isCurrentMonth 
                    ? "bg-gray-50 text-gray-400 cursor-not-allowed" 
                    : "bg-white hover:bg-blue-50 cursor-pointer hover:shadow-sm"} 
                  ${date.isToday ? "ring-2 ring-blue-500 ring-inset" : ""}
                  transition-all duration-200
                `}
                onClick={() => date.isCurrentMonth && handleDateClick(date)}
                onMouseDown={(e) => e.currentTarget.classList.add("scale-95")}
                onMouseUp={(e) => e.currentTarget.classList.remove("scale-95")}
                onMouseLeave={(e) => e.currentTarget.classList.remove("scale-95")}
              >
                {/* 日期数字 */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center mb-3
                  ${date.isToday ? "bg-blue-600 text-white" : ""}
                  ${!date.isCurrentMonth ? "text-gray-400" : "text-gray-800 font-medium"}
                `}>
                  {date.date}
                </div>

                {/* 活动显示区域（仅保留描述，移除多余元素） */}
                {date.isCurrentMonth && (
                  <>
                    {isLoading ? (
                      // 加载状态：简化骨架屏（仅1行，更简洁）
                      <div className="space-y-2 mt-1">
                        <div className="h-2 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-2 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                      </div>
                    ) : errorMsg ? (
                      // 加载失败：显示重试按钮（简化样式）
                      <button
                        onClick={fetchMonthActivities}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        重试加载
                      </button>
                    ) : activity ? (
                      // 有活动：仅显示具体活动描述（无数量、无图标）
                      <div className="mt-1">
                        <p className="text-xs text-gray-700 leading-tight line-clamp-3">
                          {activity.description}
                        </p>
                      </div>
                    ) : (
                      // 无活动：不显示任何提示文字（彻底简洁）
                      <div className="h-full"></div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}