"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FaChevronLeft, FaCalendarDay, FaClock, FaMapMarkerAlt, FaUser, FaInfoCircle } from "react-icons/fa";
import { format, isValid } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

// 定义报名人员信息类型
interface ReservedVolunteer {
  id: string; // 志愿者ID
  name: string; // 姓名
  phone: string; // 手机号
  role: string; // 志愿者角色（如TEEN_VOLUNTEER）
  reserveTime: string; // 报名时间
}

// 定义岗位-时间段的报名分布类型
interface PositionTimeSlot {
  positionId: string;
  positionName: string;
  timeSlot: string; // 时间段（如09:00-10:00）
  reservedVolunteers: ReservedVolunteer[]; // 该时间段该岗位的报名人员
  totalRequired: number; // 该时间段该岗位的总需求人数
  remaining: number; // 剩余名额
}

// 定义活动详情类型
interface AdminActivityDetail {
  id: string;
  name: string;
  date: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  timeSlots: string[]; // 所有时间段
  positionTimeSlots: PositionTimeSlot[]; // 岗位-时间段的报名分布
  totalReserved: number; // 总报名人数
  totalRequired: number; // 总需求人数
}

export default function AdminActivityDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { id: activityId } = params;

  const [activity, setActivity] = useState<AdminActivityDetail | null>(null);
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
      if (!["ADMIN", "UNI_ADMIN"].includes(adminInfo.role) || !adminInfo.token) {
        localStorage.removeItem("adminInfo");
        router.push("/admin/login");
      }
    };
    checkAdminPermission();
  }, [router]);

  // 2. 获取活动详情+人员分布
  useEffect(() => {
    if (!activityId) return;

    const fetchActivityDetail = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const adminInfo = JSON.parse(localStorage.getItem("adminInfo") || "{}");
        const response = await fetch(`/api/admin/activities/${activityId}`, {
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
          throw new Error(err.error || "获取活动详情失败");
        }

        const data: AdminActivityDetail = await response.json();
        setActivity(data);
      } catch (error) {
        setErrorMsg((error as Error).message || "加载详情失败，请返回重试");
        console.error("获取活动详情失败：", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityDetail();
  }, [activityId, router]);

  // 格式化日期
  const formatActivityDate = (dateStr: string) => {
    if (!dateStr || !isValid(new Date(dateStr))) return "日期未知";
    return format(new Date(dateStr), "yyyy年MM月dd日 EEEE", { locale: zhCN });
  };

  // 按时间段分组岗位数据
  const groupByTimeSlot = () => {
    if (!activity) return {};
    return activity.positionTimeSlots.reduce((acc, item) => {
      if (!acc[item.timeSlot]) {
        acc[item.timeSlot] = [];
      }
      acc[item.timeSlot].push(item);
      return acc;
    }, {} as Record<string, PositionTimeSlot[]>);
  };

  const timeSlotGroups = groupByTimeSlot();

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载活动详情中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (errorMsg || !activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 16a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-800 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-6">{errorMsg || "活动不存在或已删除"}</p>
          <button
            onClick={() => router.push("/admin/activities")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回活动列表
          </button>
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
            onClick={() => router.push("/admin/activities")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-2"
          >
            <FaChevronLeft className="h-5 w-5" />
            <span>返回活动列表</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800">{activity.name}</h1>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 活动基本信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-2 text-gray-700">
              <FaCalendarDay className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">活动日期</p>
                <p className="font-medium">{formatActivityDate(activity.dateStr)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <FaClock className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">活动时间</p>
                <p className="font-medium">{activity.startTime} - {activity.endTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <FaMapMarkerAlt className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">活动地点</p>
                <p className="font-medium">{activity.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 md:col-span-3">
              <FaUser className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">报名进度</p>
                <p className="font-medium">
                  已报名 <span className="text-green-600">{activity.totalReserved}</span> 人 / 
                  总需求 <span className="text-gray-600">{activity.totalRequired}</span> 人 / 
                  剩余 <span className="text-orange-600">{activity.totalRequired - activity.totalReserved}</span> 人
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-gray-700 md:col-span-3">
              <FaInfoCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">活动描述</p>
                <p className="text-gray-600 whitespace-pre-line">{activity.description || "暂无活动描述"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 人员分布详情（按时间段分组） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">时间段-岗位报名分布</h2>
          </div>

          {Object.keys(timeSlotGroups).length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p>暂无岗位-时间段配置</p>
            </div>
          ) : (
            Object.keys(timeSlotGroups).map((timeSlot) => (
              <div key={timeSlot} className="border-b border-gray-200 last:border-b-0">
                {/* 时间段标题 */}
                <div className="px-6 py-4 bg-gray-50 font-medium text-gray-800">
                  <FaClock className="h-4 w-4 text-gray-500 inline-block mr-2" />
                  {timeSlot}
                </div>

                {/* 该时间段下的所有岗位 */}
                <div className="p-6">
                  {timeSlotGroups[timeSlot].map((slot) => (
                    <div key={`${slot.timeSlot}-${slot.positionId}`} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-md font-medium text-gray-800">
                          岗位：{slot.positionName}
                        </h3>
                        <div className="text-sm">
                          已报名：<span className="text-green-600 font-medium">{slot.reservedVolunteers.length}</span> / 
                          总需求：<span className="text-gray-600">{slot.totalRequired}</span> / 
                          剩余：<span className={`font-medium ${slot.remaining > 0 ? "text-orange-600" : "text-red-600"}`}>
                            {slot.remaining}
                          </span>
                        </div>
                      </div>

                      {/* 报名人员列表 */}
                      {slot.reservedVolunteers.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                          暂无人员报名
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  序号
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  姓名
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  手机号
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  志愿者类型
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  报名时间
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {slot.reservedVolunteers.map((vol, idx) => (
                                <tr key={vol.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {idx + 1}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 flex items-center gap-1">
                                    <FaUser className="h-4 w-4 text-gray-400" />
                                    {vol.name}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {vol.phone}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {vol.role === "TEEN_VOLUNTEER" && "青少年志愿者"}
                                    {vol.role === "SOCIAL_VOLUNTEER" && "社会志愿者"}
                                    {vol.role === "UNI_VOLUNTEER" && "大学生志愿者"}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(vol.reserveTime), "yyyy-MM-dd HH:mm")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}