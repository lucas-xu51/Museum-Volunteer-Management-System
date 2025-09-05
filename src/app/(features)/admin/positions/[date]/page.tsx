"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FaChevronLeft, FaPlusCircle, FaTrashAlt, FaEdit } from "react-icons/fa";
import AdminActivityModal, { ActivityFormData } from "./AdminActivityModal";
import { VolunteerPosition } from "@prisma/client";

// 定义活动类型（与后端返回格式一致）
interface Activity extends ActivityFormData {
  id: string;
  name: string;
}

// 生成7:00-19:00的时间段（每个小时一行，共13行）
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 19; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
};

// 工具函数：获取指定时间段内的所有活动（支持重叠）
const getActivitiesByTimeSlot = (slot: string, activities: Activity[]) => {
  return activities.filter(
    (act) => act.startTime <= slot && act.endTime > slot
  );
};

// 工具函数：计算活动在当前时间段的状态（起始/中间/结束）
const getActivitySlotStatus = (activity: Activity, slot: string) => {
  const slotHour = parseInt(slot.split(":")[0]);
  const startHour = parseInt(activity.startTime.split(":")[0]);
  const endHour = parseInt(activity.endTime.split(":")[0]);

  if (slotHour === startHour) return "start";
  if (slotHour > startHour && slotHour < endHour) return "middle";
  return "end";
};

export default function AdminDateActivityPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const selectedDate = params.date;
  
  // 状态管理
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Omit<ActivityFormData, "id"> | undefined>(undefined);
  const [positions, setPositions] = useState<VolunteerPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const timeSlots = generateTimeSlots();

  // 认证头函数
  const getAuthHeaders = () => {
    const adminInfo = localStorage.getItem("adminInfo");
    const adminData = adminInfo ? JSON.parse(adminInfo) : null;
    const token = adminData?.token || "";
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  };

  // 页面加载：获取岗位列表 + 当日活动
  useEffect(() => {
    const fetchAllData = async () => {
      if (!selectedDate) return;
      setIsLoading(true);
      setErrorMsg("");

      try {
        const [positionsRes, activitiesRes] = await Promise.all([
          fetch("/api/admin/positions", { headers: getAuthHeaders() }),
          fetch(`/api/admin/activities/date/${selectedDate}`, { headers: getAuthHeaders() }),
        ]);

        if (!positionsRes.ok) throw new Error("获取岗位列表失败");
        if (!activitiesRes.ok) throw new Error("获取当日活动失败");

        const positionsData: VolunteerPosition[] = await positionsRes.json();
        const activitiesData: Activity[] = await activitiesRes.json();

        setPositions(positionsData.filter(p => p.isActive));
        setActivities(activitiesData);
      } catch (err) {
        setErrorMsg((err as Error).message || "数据加载失败，请刷新页面重试");
        console.error("加载数据失败：", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [selectedDate]);

  // 格式化日期显示
  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  };

  // 新增活动：打开弹窗
  const handleAddActivityOpen = () => {
    setIsAddModalOpen(true);
    setEditActivity(undefined);
  };

  // 编辑活动：打开弹窗
  const handleEditActivityOpen = (activity: Activity) => {
    setEditActivity({
      name: activity.name,
      date: activity.date,
      startTime: activity.startTime,
      endTime: activity.endTime,
      positions: activity.positions,
      location: activity.location,
      description: activity.description,
    });
    setIsEditModalOpen(true);
  };

  // 提交活动（新增/编辑）
  const handleActivitySubmit = async (formData: Omit<ActivityFormData, "id">) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const requestData = {
        ...formData,
        positions: formData.positions.map(p => ({
          positionId: p.positionId,
          count: p.count,
        })),
      };

      if (isEditModalOpen && editActivity) {
        const activityToEdit = activities.find(
          act => act.startTime === editActivity.startTime && act.location === editActivity.location
        );
        if (!activityToEdit) throw new Error("未找到待编辑的活动");

        const res = await fetch("/api/admin/activities", {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...requestData, id: activityToEdit.id }),
        });

        if (!res.ok) throw new Error("更新活动失败");

        setActivities(prev =>
          prev.map(act => act.id === activityToEdit.id ? { ...act, ...formData, id: act.id } : act)
        );
        setIsEditModalOpen(false);
      } else {
        const res = await fetch("/api/admin/activities", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(requestData),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "创建活动失败");
        }

        const { id } = await res.json();
        setActivities(prev => [...prev, { ...formData, id } as Activity]);
        setIsAddModalOpen(false);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || "操作失败，请重试");
      console.error("提交活动失败：", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除活动
  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm("确定要删除这个活动吗？关联的岗位需求也会一并删除")) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/admin/activities?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error("删除活动失败");

      setActivities(prev => prev.filter(act => act.id !== id));
    } catch (err) {
      setErrorMsg((err as Error).message || "删除失败，请重试");
      console.error("删除活动失败：", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 跳回日历页面
  const goBackToCalendar = () => {
    router.push("/admin/positions");
  };

  // 日期无效时显示
  if (!selectedDate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">日期参数无效</p>
          <button onClick={goBackToCalendar} className="text-blue-600 hover:text-blue-800">
            返回日历
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 错误提示 */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 shadow-sm border border-red-100">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 16a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <button
          onClick={() => router.push("/admin/positions")}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
          disabled={isLoading}
        >
          <FaChevronLeft className="h-5 w-5" />
          <span className="font-medium">返回岗位日历</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          {formatDisplayDate(selectedDate)} 活动管理
        </h1>

        <button
          onClick={handleAddActivityOpen}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg font-medium"
          disabled={isLoading || positions.length === 0}
        >
          <FaPlusCircle className="h-5 w-5" />
          <span>添加活动</span>
        </button>
      </div>

      {/* 加载状态覆盖层 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">处理中...</p>
          </div>
        </div>
      )}

      {/* 左右分栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：活动列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden h-full transition-shadow hover:shadow-lg">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">当日活动列表</h2>
              {isLoading && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">加载中...</span>
              )}
            </div>

            <div className="p-4">
              {isLoading ? (
                // 加载中占位
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 border border-gray-100 rounded-lg animate-pulse bg-gray-50">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                // 无活动
                <div className="text-center py-16 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium mb-4">暂无当日活动</p>
                  <button
                    onClick={handleAddActivityOpen}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium px-4 py-2 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors"
                    disabled={positions.length === 0}
                  >
                    + 点击添加活动
                  </button>
                </div>
              ) : (
                // 活动列表
                <div className="space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-all hover:border-blue-100 bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{activity.name}</h3> {/* 活动名称（突出显示） */}
                        <p className="text-sm text-gray-500">{activity.startTime} - {activity.endTime}</p> {/* 时间（次要信息） */}
                        <div className="flex gap-2">
                          <button
                            className="text-yellow-500 hover:text-yellow-600 p-1.5 rounded-full hover:bg-yellow-50 transition-colors"
                            aria-label="编辑活动"
                            onClick={() => handleEditActivityOpen(activity)}
                            disabled={isLoading}
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                            aria-label="删除活动"
                            onClick={() => handleDeleteActivity(activity.id)}
                            disabled={isLoading}
                          >
                            <FaTrashAlt className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {/* 岗位需求（突出总人数） */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">
                          岗位需求（总需{activity.positions.reduce((sum, p) => sum + p.count, 0)}人）：
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {activity.positions.map((pos, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
                            >
                              {pos.positionName} ×{pos.count}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1.5">
                        <span className="font-medium">地点：</span>
                        {activity.location}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        <span className="font-medium">描述：</span>
                        {activity.description || "无"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：时间表（核心优化：多活动并列卡片） */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden h-full transition-shadow hover:shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">当日时间表（7:00-19:00）</h2>
              <p className="text-sm text-gray-500 mt-1">
                同一时间段多活动将并列显示，每个卡片包含完整活动信息
              </p>
            </div>

            {/* 表格布局（时间列 + 活动卡片列） */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    {/* 时间列（固定宽度） */}
                    <th className="w-24 py-4 px-4 text-left font-semibold text-gray-700">时间段</th>
                    {/* 活动列（自适应宽度，承载并列卡片） */}
                    <th className="py-4 px-4 text-left font-semibold text-gray-700">活动及志愿者需求</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 遍历每个时间段（7:00-19:00） */}
                  {timeSlots.map((slot, rowIdx) => {
                    const currentHour = slot;
                    const nextHour = `${String(parseInt(slot.split(":")[0]) + 1).padStart(2, "0")}:00`;
                    const slotActivities = getActivitiesByTimeSlot(slot, activities);
                    // 根据活动数量设置卡片宽度（多活动时自动缩小，避免溢出）
                    const cardWidth = slotActivities.length > 1 
                      ? `calc(${100 / slotActivities.length}% - 0.75rem)` 
                      : "100%";

                    return (
                      <tr 
                        key={`time-row-${rowIdx}`} 
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* 时间单元格（固定显示当前时段） */}
                        <td 
                          className="py-6 px-4 font-medium text-gray-800 border-r border-gray-100 bg-white"
                          valign="top"
                        >
                          {currentHour} - {nextHour}
                        </td>

                        {/* 活动卡片列（多活动并列，单活动全屏） */}
                        <td className="py-4 px-4">
                          {slotActivities.length > 0 ? (
                            // 多活动时：水平并列布局
                            <div className="flex flex-wrap gap-3">
                              {slotActivities.map((activity) => {
                                const slotStatus = getActivitySlotStatus(activity, slot);
                                const totalVolunteers = activity.positions.reduce((sum, p) => sum + p.count, 0);
                                return (
                                  // 活动卡片（独立容器，包含所有信息）
                                  <div 
                                    key={activity.id}
                                    style={{ width: cardWidth }}
                                    className={`p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                                      slotStatus === "start" 
                                        ? "border-blue-200 bg-blue-50 hover:border-blue-300" 
                                        : slotStatus === "middle" 
                                          ? "border-gray-200 bg-gray-50 hover:border-gray-300" 
                                          : "border-green-200 bg-green-50 hover:border-green-300"
                                    }`}
                                  >
                                    

                                    {/* 3. 活动地点 */}
                                    <div className="flex items-center text-sm text-gray-700 mb-3">
                                      <svg className="h-4 w-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {activity.location}
                                    </div>

                                    {/* 4. 志愿者需求（核心信息，突出显示） */}
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-1.5">志愿者需求：</p>
                                      {/* 总人数提示 */}
                                      <p className="text-sm font-semibold text-blue-700 mb-2">
                                        共需 {totalVolunteers} 人
                                      </p>
                                      {/* 详细岗位拆分 */}
                                      <div className="flex flex-wrap gap-1.5">
                                        {activity.positions.map((pos, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium"
                                          >
                                            {pos.positionName} ×{pos.count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            // 无活动：空状态提示
                            <div className="py-12 text-center text-gray-400">
                              <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm italic">无进行中的活动</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 活动 Modal */}
      <AdminActivityModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setEditActivity(undefined);
        }}
        onSubmit={handleActivitySubmit}
        selectedDate={selectedDate}
        timeSlots={timeSlots}
        positions={positions}
        initialData={editActivity}
      />
    </div>
  );
}