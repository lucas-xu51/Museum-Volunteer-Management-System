"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  FaChevronLeft, FaClock, FaMapMarkerAlt, FaInfoCircle, 
  FaUserClock, FaCheckCircle, FaExclamationCircle, 
  FaCalendarDay, FaSignInAlt, FaSignOutAlt, FaHistory
} from "react-icons/fa";
import { format, isValid, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

// 定义活动详情类型（与API返回格式匹配）
interface ActivityDetail {
  id: string;
  name: string;
  date: string; // ISO日期
  dateStr: string; // YYYY-MM-DD 格式
  startTime: string; // 如 "09:00"
  endTime: string; // 如 "11:00"
  location: string;
  description: string;
  timeSlots: string[]; // 拆分后的小时时间段
  myReservations: {
    timeSlot: string;
    positionConfigId: string;
  }[];
  myCheckIns: {
    id: string;
    timeSlot: string;
    activityPositionId: string;
    checkInTime: string;
    checkOutTime: string | null;
  }[];
  positions: {
    id: string; // 岗位配置ID
    count: number; // 每小时需求人数
    position: {
      id: string;
      name: string; // 岗位名称
      description: string; // 岗位描述
      isAllowed: boolean; // 是否允许当前志愿者报名
    };
  }[];
}

// 定义报名状态类型
type ReserveStatus = "idle" | "loading" | "success" | "error";
// 定义打卡状态类型
type CheckInStatus = "idle" | "checking-in" | "checking-out" | "success" | "error";

export default function VolunteerActivityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { id: activityId } = params;

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reserveStatus, setReserveStatus] = useState<ReserveStatus>("idle");
  const [reserveMsg, setReserveMsg] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("idle");
  const [checkInMsg, setCheckInMsg] = useState("");
  
  // 存储每个时间段+岗位的报名情况
  const [reservationCounts, setReservationCounts] = useState<Record<string, Record<string, {
    reserved: number;
    total: number;
    remaining: number;
  }>>>({});

  // 权限校验：确保登录且为志愿者角色
  useEffect(() => {
    const checkPermission = () => {
      const userInfoStr = localStorage.getItem("volunteerInfo");
      if (!userInfoStr) {
        router.push("/volunteer/login");
        return;
      }
      const userInfo = JSON.parse(userInfoStr);
      const { role, sessionToken } = userInfo;
      const volunteerRoles = ["TEEN_VOLUNTEER", "SOCIAL_VOLUNTEER", "UNI_VOLUNTEER"];
      
      if (!volunteerRoles.includes(role) || !sessionToken) {
        localStorage.removeItem("volunteerInfo");
        router.push("/volunteer/login");
      }
    };
    checkPermission();
  }, [router]);

  // 获取活动详情和已打卡记录
  useEffect(() => {
    if (!activityId) return;

    const fetchActivityDetail = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const userInfoStr = localStorage.getItem("volunteerInfo");
        if (!userInfoStr) {
          router.push("/volunteer/login");
          return;
        }
        const userInfo = JSON.parse(userInfoStr);
        const { sessionToken } = userInfo;

        if (!sessionToken) {
          setErrorMsg("登录信息不完整，请重新登录");
          localStorage.removeItem("volunteerInfo");
          router.push("/volunteer/login");
          return;
        }

        // 获取活动详情
        const activityResponse = await fetch(`/api/volunteer/activities/${activityId}`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`
          }
        });

        if (!activityResponse.ok) {
          const err = await activityResponse.json();
          if (activityResponse.status === 401) {
            localStorage.removeItem("volunteerInfo");
            router.push("/volunteer/login");
          }
          throw new Error(err.error || "获取活动详情失败");
        }

        const activityData: ActivityDetail = await activityResponse.json();
        
        // 获取已打卡记录
        const checkInResponse = await fetch(`/api/volunteer/activities/${activityId}/check-in-records`, {
          headers: {
            "Authorization": `Bearer ${sessionToken}`
          }
        });

        if (checkInResponse.ok) {
          const checkInData = await checkInResponse.json();
          activityData.myCheckIns = checkInData.data || [];
        }

        // 处理日期格式
        if (!activityData.dateStr || !isValid(new Date(activityData.dateStr))) {
          activityData.dateStr = new Date().toISOString().split("T")[0];
        }
        setActivity(activityData);

        // 初始化报名情况存储
        const initCounts: Record<string, Record<string, any>> = {};
        activityData.timeSlots.forEach(slot => {
          initCounts[slot] = {};
          activityData.positions.forEach(pos => {
            initCounts[slot][pos.id] = { 
              reserved: 0, 
              total: pos.count, 
              remaining: pos.count 
            };
            fetchReservationCount(slot, pos.id);
          });
        });
        setReservationCounts(initCounts);
      } catch (error) {
        setErrorMsg((error as Error).message || "加载活动详情失败，请返回重试");
        console.error("获取活动详情失败：", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityDetail();
  }, [activityId, router]);

  // 获取某个时间段+岗位的报名情况
  const fetchReservationCount = async (timeSlot: string, positionConfigId: string) => {
    try {
      const userInfoStr = localStorage.getItem("volunteerInfo");
      if (!userInfoStr) return;
      const userInfo = JSON.parse(userInfoStr);
      const { sessionToken } = userInfo;

      if (!sessionToken) return;

      const response = await fetch(
        `/api/volunteer/activities/${activityId}/reservation-count?timeSlot=${encodeURIComponent(timeSlot)}&positionConfigId=${positionConfigId}`,
        {
          headers: {
            "Authorization": `Bearer ${sessionToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReservationCounts(prev => ({
          ...prev,
          [timeSlot]: {
            ...prev[timeSlot],
            [positionConfigId]: {
              reserved: data.reservedCount,
              total: data.totalCount,
              remaining: data.remainingCount
            }
          }
        }));
      }
    } catch (error) {
      console.error(`查询${timeSlot}-${positionConfigId}报名情况失败：`, error);
    }
  };

  // 提交报名
  const handleReserve = async (timeSlot: string, positionConfigId: string) => {
    if (!activity) return;

    // 检查是否已报名
    const isAlreadyReserved = activity.myReservations.some(
      res => res.timeSlot === timeSlot && res.positionConfigId === positionConfigId
    );
    if (isAlreadyReserved) {
      setReserveStatus("error");
      setReserveMsg("您已报名该时间段的该岗位，无需重复报名");
      setTimeout(() => setReserveStatus("idle"), 3000);
      return;
    }

    // 检查名额是否充足
    const countInfo = reservationCounts[timeSlot]?.[positionConfigId];
    if (!countInfo || countInfo.remaining <= 0) {
      setReserveStatus("error");
      setReserveMsg("该时间段的该岗位已报满，无法报名");
      setTimeout(() => setReserveStatus("idle"), 3000);
      return;
    }

    // 检查岗位是否允许报名
    const position = activity.positions.find(pos => pos.id === positionConfigId);
    if (!position || !position.position.isAllowed) {
      setReserveStatus("error");
      setReserveMsg("您的身份不符合该岗位的报名要求");
      setTimeout(() => setReserveStatus("idle"), 3000);
      return;
    }

    // 提交报名请求
    setReserveStatus("loading");
    setReserveMsg("正在提交报名...");
    try {
      const userInfoStr = localStorage.getItem("volunteerInfo");
      if (!userInfoStr) {
        router.push("/volunteer/login");
        return;
      }
      const userInfo = JSON.parse(userInfoStr);
      const { sessionToken } = userInfo;

      if (!sessionToken) {
        throw new Error("登录信息不完整，请重新登录");
      }

      const response = await fetch(`/api/volunteer/activities/${activityId}/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ timeSlot, positionConfigId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "报名失败");
      }

      // 报名成功更新状态
      setReserveStatus("success");
      setReserveMsg("报名成功！请按时参与活动");
      setActivity(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          myReservations: [...prev.myReservations, { timeSlot, positionConfigId }]
        };
      });
      setReservationCounts(prev => ({
        ...prev,
        [timeSlot]: {
          ...prev[timeSlot],
          [positionConfigId]: {
            ...prev[timeSlot][positionConfigId],
            reserved: prev[timeSlot][positionConfigId].reserved + 1,
            remaining: prev[timeSlot][positionConfigId].remaining - 1
          }
        }
      }));
    } catch (error) {
      setReserveStatus("error");
      setReserveMsg((error as Error).message || "报名失败，请稍后重试");
    } finally {
      setTimeout(() => setReserveStatus("idle"), 3000);
    }
  };
  
  // 处理打卡/签退
  // 修改handleCheckIn函数，自动计算签退时间
  const handleCheckIn = async (
    timeSlot: string, 
    activityPositionId: string,
    isCheckOut: boolean = false
  ) => {
    if (!activity) return;

    // 检查是否已报名
    const isReserved = activity.myReservations.some(
      res => res.timeSlot === timeSlot && res.positionConfigId === activityPositionId
    );
    if (!isReserved) {
      setCheckInStatus("error");
      setCheckInMsg("请先报名该时间段的岗位才能打卡");
      setTimeout(() => setCheckInStatus("idle"), 3000);
      return;
    }

    // 检查是否已打卡/签退
    const existingCheckIn = activity.myCheckIns.find(
      checkIn => checkIn.timeSlot === timeSlot && checkIn.activityPositionId === activityPositionId
    );
    
    if (!isCheckOut && existingCheckIn) {
      setCheckInStatus("error");
      setCheckInMsg("您已完成该时间段的打卡");
      setTimeout(() => setCheckInStatus("idle"), 3000);
      return;
    }
    
    if (isCheckOut && (!existingCheckIn || existingCheckIn.checkOutTime)) {
      setCheckInStatus("error");
      setCheckInMsg("您尚未打卡或已完成签退");
      setTimeout(() => setCheckInStatus("idle"), 3000);
      return;
    }

    // 提交打卡/签退请求
    setCheckInStatus(isCheckOut ? "checking-out" : "checking-in");
    setCheckInMsg(isCheckOut ? "正在提交签退..." : "正在提交打卡...");
    
    try {
      const userInfoStr = localStorage.getItem("volunteerInfo");
      if (!userInfoStr) {
        router.push("/volunteer/login");
        return;
      }
      const userInfo = JSON.parse(userInfoStr);
      const { sessionToken } = userInfo;

      if (!sessionToken) {
        throw new Error("登录信息不完整，请重新登录");
      }

      // 获取当前时间作为打卡时间
      const now = new Date();
      const checkInTime = now.toISOString();
      
      // 自动计算签退时间为打卡后一小时
      const checkOutTimeObj = new Date(now);
      checkOutTimeObj.setHours(now.getHours() + 1); // 延后一小时
      const checkOutTime = checkOutTimeObj.toISOString();
      
      // 构建请求体 - 使用与后端匹配的参数名
      const requestBody = {
        timeSlot: timeSlot,
        positionConfigId: activityPositionId,
        checkInTime: isCheckOut ? (existingCheckIn?.checkInTime || checkInTime) : checkInTime,
        // 打卡时自动设置签退时间为1小时后，签退时使用当前计算的时间
        checkOutTime: isCheckOut ? new Date().toISOString() : checkOutTime
      };

      console.log("打卡请求参数:", requestBody);

      const response = await fetch(`/api/volunteer/activities/${activityId}/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (isCheckOut ? "签退失败" : "打卡失败"));
      }

      // 打卡/签退成功更新状态
      setCheckInStatus("success");
      setCheckInMsg(
        isCheckOut 
          ? "签退成功！感谢您的参与" 
          : `打卡成功！系统已自动设置1小时后签退（${format(new Date(checkOutTime), "HH:mm:ss")}）`
      );
      
      // 更新已打卡记录
      setActivity(prev => {
        if (!prev) return prev;
        
        const updatedCheckIns = [...prev.myCheckIns];
        if (isCheckOut && existingCheckIn) {
          // 更新签退时间
          const index = updatedCheckIns.findIndex(
            checkIn => checkIn.id === existingCheckIn.id
          );
          if (index !== -1) {
            updatedCheckIns[index] = {
              ...updatedCheckIns[index],
              checkOutTime: new Date().toISOString()
            };
          }
        } else if (!isCheckOut) {
          // 添加新的打卡记录，包含自动计算的签退时间
          updatedCheckIns.push({
            id: data.data.id,
            timeSlot,
            activityPositionId: activityPositionId,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime // 存储自动计算的签退时间
          });
        }
        
        return {
          ...prev,
          myCheckIns: updatedCheckIns
        };
      });
    } catch (error) {
      setCheckInStatus("error");
      setCheckInMsg((error as Error).message || (isCheckOut ? "签退失败，请稍后重试" : "打卡失败，请稍后重试"));
    } finally {
      setTimeout(() => setCheckInStatus("idle"), 3000);
    }
  };


  // 格式化日期显示
  const formatActivityDate = (dateStr: string | undefined | null) => {
    if (!dateStr || typeof dateStr !== "string") {
      return "日期未知";
    }

    let date = new Date(dateStr);
    if (!isValid(date)) {
      const normalizedDateStr = dateStr.replace(/\//g, "-");
      date = new Date(normalizedDateStr);
      if (!isValid(date)) {
        return "日期格式错误";
      }
    }

    return format(date, "yyyy年MM月dd日 EEEE", { locale: zhCN });
  };

  // 格式化时间显示
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "未设置";
    
    const date = parseISO(timeStr);
    return isValid(date) ? format(date, "HH:mm:ss") : timeStr;
  };

  // 返回活动列表页
  const goBack = () => {
    router.push("/volunteer/events");
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700 font-medium">加载活动详情中...</p>
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
          <p className="text-gray-600 mb-6">{errorMsg || "活动详情不存在或已删除"}</p>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回活动列表
          </button>
        </div>
      </div>
    );
  }

  // 页面渲染
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <button
            onClick={goBack}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="返回"
          >
            <FaChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{activity.name || "活动名称"}</h1>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 状态提示 */}
        {(reserveStatus !== "idle" || checkInStatus !== "idle") && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            reserveStatus === "success" || checkInStatus === "success" 
              ? "bg-green-50 text-green-600" 
              : reserveStatus === "error" || checkInStatus === "error"
                ? "bg-red-50 text-red-600" 
                : "bg-blue-50 text-blue-600"
          }`}>
            {reserveStatus === "success" || checkInStatus === "success" && 
              <FaCheckCircle className="h-5 w-5" />}
            {reserveStatus === "error" || checkInStatus === "error" && 
              <FaExclamationCircle className="h-5 w-5" />}
            {(reserveStatus === "loading" || checkInStatus === "checking-in" || checkInStatus === "checking-out") && 
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>}
            <span>{reserveMsg || checkInMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：活动详情卡片 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* 活动基本信息 */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 mb-4">
                  <FaCalendarDay className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{formatActivityDate(activity.dateStr)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <FaClock className="h-5 w-5 text-gray-500" />
                  <span>活动时间：{activity.startTime || "未设置"} - {activity.endTime || "未设置"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <FaMapMarkerAlt className="h-5 w-5 text-gray-500" />
                  <span>活动地点：{activity.location || "未设置"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FaUserClock className="h-5 w-5 text-gray-500" />
                  <span>总时长：{activity.timeSlots?.length || 0}小时</span>
                </div>
              </div>

              {/* 活动详细描述 */}
              <div className="p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                  <FaInfoCircle className="h-5 w-5 text-blue-600" />
                  活动描述
                </h3>
                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {activity.description || "暂无详细活动描述"}
                </div>
              </div>

              {/* 岗位详情 */}
              <div className="p-6 border-t border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">岗位需求</h3>
                {activity.positions.length > 0 ? (
                  <div className="space-y-4">
                    {activity.positions.map((pos) => (
                      <div key={pos.id} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">{pos.position.name || "未命名岗位"}</h4>
                        <p className="text-gray-600 text-sm mb-2">
                          每小时需求：{pos.count || 0}人（总需求：{(pos.count || 0) * (activity.timeSlots?.length || 0)}人）
                        </p>
                        <p className="text-gray-500 text-xs">
                          岗位描述：{pos.position.description || "暂无岗位描述"}
                        </p>
                        {!pos.position.isAllowed && (
                          <p className="mt-2 text-xs text-red-500">
                            ⚠️ 您的身份不符合该岗位的报名要求
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无岗位配置</p>
                )}
              </div>

              {/* 打卡记录 */}
              {activity.myCheckIns.length > 0 && (
                <div className="p-6 border-t border-gray-100">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                    <FaHistory className="h-5 w-5 text-blue-600" />
                    我的打卡记录
                  </h3>
                  <div className="space-y-3">
                    {activity.myCheckIns.map((checkIn) => {
                      const position = activity.positions.find(
                        pos => pos.id === checkIn.activityPositionId
                      );
                      return (
                        <div key={checkIn.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-800">{checkIn.timeSlot}</p>
                              <p className="text-sm text-gray-500">
                                {position?.position.name || "未知岗位"}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              checkIn.checkOutTime 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {checkIn.checkOutTime ? "已完成" : "已打卡待签退"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="text-gray-400">打卡时间：</span>
                              {formatTime(checkIn.checkInTime)}
                            </div>
                            <div>
                              <span className="text-gray-400">签退时间：</span>
                              {checkIn.checkOutTime ? formatTime(checkIn.checkOutTime) : "未签退"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：小时级时间表与报名打卡 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">活动时间段管理</h2>
                <p className="text-gray-500 text-sm mt-1">
                  您可以报名参与活动，活动开始后可进行打卡和签退操作
                </p>
              </div>

              {/* 时间表表头 */}
              {activity.positions.length > 0 ? (
                <>
                  <div className="grid grid-cols-12 border-b border-gray-200 bg-gray-50">
                    <div className="col-span-3 p-4 font-medium text-gray-700 border-r border-gray-200">
                      时间段
                    </div>
                    {activity.positions.map((pos) => (
                      <div key={pos.id} className="col-span-9 sm:col-span-3 p-4 font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                        {pos.position.name || "未命名岗位"}
                        <br />
                        <span className="text-xs text-gray-500">
                          {pos.count || 0}人/小时
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 时间表内容（按小时拆分） */}
                  <div className="divide-y divide-gray-200">
                    {activity.timeSlots.length > 0 ? (
                      activity.timeSlots.map((timeSlot) => (
                        <div key={timeSlot} className="grid grid-cols-12">
                          {/* 时间段列 */}
                          <div className="col-span-3 p-4 border-r border-gray-200 bg-gray-50 font-medium text-gray-700">
                            {timeSlot}
                          </div>

                          {/* 每个岗位的操作列 */}
                          {activity.positions.map((pos) => {
                            const countInfo = reservationCounts[timeSlot]?.[pos.id] || {
                              reserved: 0,
                              total: pos.count || 0,
                              remaining: pos.count || 0
                            };
                            
                            // 检查是否已报名该时间段+岗位
                            const isReserved = activity.myReservations.some(
                              res => res.timeSlot === timeSlot && res.positionConfigId === pos.id
                            );
                            
                            // 检查是否已打卡
                            const checkInRecord = activity.myCheckIns.find(
                              checkIn => checkIn.timeSlot === timeSlot && checkIn.activityPositionId === pos.id
                            );
                            
                            // 测试阶段：随时都可以打卡，移除时间限制
                            const canCheckIn = true; // 测试阶段随时可以打卡
                            const canCheckOut = true; // 测试阶段随时可以签退

                            return (
                              <div key={pos.id} className="col-span-9 sm:col-span-3 p-4 border-r border-gray-200 last:border-r-0 flex flex-col items-center justify-center">
                                {/* 状态提示 */}
                                {isReserved ? (
                                  <div className="flex items-center gap-1 text-green-600 text-sm mb-2">
                                    <FaCheckCircle className="h-4 w-4" />
                                    <span>已报名</span>
                                  </div>
                                ) : (
                                  <div className="text-gray-500 text-xs mb-2">
                                    已报{countInfo.reserved}/{countInfo.total}人
                                  </div>
                                )}

                                {/* 打卡/签退状态 */}
                                {checkInRecord ? (
                                  <div className="text-xs mb-2">
                                    {checkInRecord.checkOutTime ? (
                                      <span className="text-green-600">已完成：{formatTime(checkInRecord.checkOutTime)}</span>
                                    ) : (
                                      <span className="text-yellow-600">已打卡：{formatTime(checkInRecord.checkInTime)}</span>
                                    )}
                                  </div>
                                ) : null}

                                {/* 操作按钮组 */}
                                <div className="flex gap-2">
                                  {/* 报名按钮 */}
                                  {!isReserved && (
                                    <button
                                      onClick={() => handleReserve(timeSlot, pos.id)}
                                      disabled={!pos.position.isAllowed || countInfo.remaining <= 0 || reserveStatus === "loading"}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        !pos.position.isAllowed
                                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                          : countInfo.remaining <= 0
                                            ? "bg-red-100 text-red-400 cursor-not-allowed"
                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                      }`}
                                    >
                                      报名
                                    </button>
                                  )}

                                  {/* 打卡按钮 */}
                                  {isReserved && !checkInRecord && canCheckIn && (
                                    <button
                                      onClick={() => handleCheckIn(timeSlot, pos.id, false)}
                                      disabled={checkInStatus !== "idle"}
                                      className="px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                                    >
                                      <FaSignInAlt className="h-3 w-3 inline mr-1" />
                                      打卡
                                    </button>
                                  )}

                                  {/* 签退按钮 */}
                                  {isReserved && checkInRecord && !checkInRecord.checkOutTime && canCheckOut && (
                                    <button
                                      onClick={() => handleCheckIn(timeSlot, pos.id, true)}
                                      disabled={checkInStatus !== "idle"}
                                      className="px-2 py-1 rounded text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                                    >
                                      <FaSignOutAlt className="h-3 w-3 inline mr-1" />
                                      签退
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        暂无可用时间段
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  暂无岗位配置，无法报名
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}