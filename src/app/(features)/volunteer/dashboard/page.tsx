"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaCalendarAlt,
  FaClock,
  FaClipboardList,
  FaBell,
  FaChevronRight,
  FaSignOutAlt
} from "react-icons/fa";

// 定义用户信息类型（与后端返回结构严格匹配）
interface UserInfo {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  sessionToken: string; // 明确包含令牌字段
}

// 定义后端响应类型
interface DashboardResponse {
  userInfo: Omit<UserInfo, 'sessionToken'>; // 后端可能不返回令牌
  expiresIn?: number; // 令牌有效期（可选）
}

export default function VolunteerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // 登出功能
  const handleLogout = () => {
    localStorage.removeItem("volunteerInfo");
    router.push("/volunteer/login");
  };

  // 验证登录状态并获取用户信息
  useEffect(() => {
    const verifyLogin = async () => {
      // 1. 获取并验证本地登录信息
      const storedVolunteer = localStorage.getItem("volunteerInfo");
      if (!storedVolunteer) {
        router.push("/volunteer/login");
        return;
      }

      try {
        // 解析本地存储的信息（增加异常捕获）
        const volunteerInfo: UserInfo = JSON.parse(storedVolunteer);
        const { sessionToken, id, name, role } = volunteerInfo;

        // 2. 验证令牌存在性
        if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '') {
          throw new Error("登录信息不完整，缺少认证令牌");
        }

        // 3. 后端验证身份（优化请求配置）
        const response = await fetch("/api/volunteer/dashboard", {
          method: "GET",
          headers: { 
            "Authorization": `Bearer ${sessionToken.trim()}`, // 确保没有多余空格
            // GET请求通常不需要Content-Type，避免后端解析问题
          },
          credentials: "include", // 处理跨域cookie（如果后端需要）
        });

        // 4. 处理后端响应
        if (!response.ok) {
          // 区分401（令牌无效）和其他错误
          if (response.status === 401) {
            throw new Error("登录已过期，请重新登录");
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `服务器错误: ${response.status}`);
        }

        // 5. 处理成功响应
        const data: DashboardResponse = await response.json();
        // 合并本地令牌和后端返回的用户信息
        const updatedUserInfo = {
          ...volunteerInfo,
          ...data.userInfo, // 用后端数据更新用户信息
          sessionToken // 保留本地令牌
        };
        
        setUserInfo(updatedUserInfo);
        // 更新本地存储（保持信息同步）
        localStorage.setItem("volunteerInfo", JSON.stringify(updatedUserInfo));

      } catch (err) {
        console.error("身份验证失败：", err);
        const errorMsg = err instanceof Error ? err.message : "登录状态异常，请重新登录";
        setError(errorMsg);
        // 清除无效的登录信息
        localStorage.removeItem("volunteerInfo");
        // 延迟跳转，让用户看到错误信息
        setTimeout(() => router.push("/volunteer/login"), 2000);
      } finally {
        setLoading(false);
      }
    };

    verifyLogin();
  }, [router]);

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">验证登录状态中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">登录验证失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/volunteer/login")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            重新登录
          </button>
        </div>
      </div>
    );
  }

  // 角色文本映射
  const roleTextMap: Record<string, string> = {
    "TEEN_VOLUNTEER": "青少年志愿者",
    "SOCIAL_VOLUNTEER": "社会志愿者",
    "UNI_VOLUNTEER": "大学生志愿者"
  };

  return (
    <div>
      {/* 欢迎信息 */}
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-gray-900">欢迎回来，{userInfo?.name}</h2>
        <p className="mt-2 text-gray-600">您的身份：{roleTextMap[userInfo?.role || ""]}</p>
      </div>

      {/* 四大功能板块入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 活动时间 */}
        <Link href="/volunteer/events">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                <FaCalendarAlt className="h-7 w-7" />
              </div>
              <FaChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">活动时间</h3>
            <p className="mt-2 text-gray-600">查看可参与的志愿者活动，了解活动详情和时间安排</p>
          </div>
        </Link>

        {/* 2. 我的预约 */}
        <Link href="/volunteer/reservations">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <FaClipboardList className="h-7 w-7" />
              </div>
              <FaChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">我的预约</h3>
            <p className="mt-2 text-gray-600">管理您的活动预约，查看预约状态或取消预约</p>
          </div>
        </Link>

        {/* 3. 时间统计 */}
        <Link href="/volunteer/hours">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
                <FaClock className="h-7 w-7" />
              </div>
              <FaChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">时间统计</h3>
            <p className="mt-2 text-gray-600">查看您的累计志愿服务时长和历史服务记录</p>
          </div>
        </Link>

        {/* 4. 通知 */}
        <Link href="/volunteer/notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <FaBell className="h-7 w-7" />
              </div>
              <FaChevronRight className="h-5 w-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">通知</h3>
            <p className="mt-2 text-gray-600">接收活动提醒、预约变动等系统通知</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
