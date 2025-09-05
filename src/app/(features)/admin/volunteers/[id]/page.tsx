"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  MapPin, 
  Award, 
  Briefcase 
} from "lucide-react";

// 配置axios默认设置
axios.defaults.withCredentials = true;

// 从localStorage获取管理员token
const getAdminToken = () => {
  if (typeof window !== "undefined") {
    const adminInfo = localStorage.getItem("adminInfo");
    if (adminInfo) {
      try {
        const parsedInfo = JSON.parse(adminInfo);
        return parsedInfo.token || "";
      } catch (e) {
        console.error("解析adminInfo失败:", e);
        return "";
      }
    }
  }
  return "";
};

// 志愿者详情页面
export default function VolunteerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 返回列表页
  const goBack = () => {
    router.push("/admin/volunteers");
  };

  // 获取志愿者详情（添加认证逻辑）
  const fetchVolunteerDetail = async () => {
    try {
      setLoading(true);
      const adminToken = getAdminToken();
      
      // 检查是否有管理员token
      if (!adminToken) {
        setError("请先登录管理员账号");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
        return;
      }

      // 请求时携带Authorization头
      const res = await axios.get(`/api/admin/volunteers/${id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });
      
      setVolunteer(res.data.data);
      setError("");
    } catch (err: any) {
      console.error("获取志愿者详情错误:", err);
      
      // 处理401未授权错误
      if (err.response?.status === 401) {
        setError("登录已过期，请重新登录");
        localStorage.removeItem("adminInfo"); // 清除过期的登录信息
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
      } else {
        setError(err.response?.data?.error || "获取志愿者详情失败");
      }
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (id && typeof id === "string") {
      fetchVolunteerDetail();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <button 
              onClick={goBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              返回志愿者列表
            </button>
            <h1 className="text-2xl font-bold text-gray-800">志愿者详情</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* 左侧头像区域 */}
              <div className="w-full md:w-64 flex justify-center md:justify-start">
                <div className="h-48 w-48 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
              
              {/* 右侧信息区域 */}
              <div className="flex-1 space-y-6">
                <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 活动记录区域 */}
            <div className="mt-12">
              <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse mb-6"></div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <button 
              onClick={goBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              返回志愿者列表
            </button>
            <h1 className="text-2xl font-bold text-gray-800">志愿者详情</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回志愿者列表
          </button>
        </main>
      </div>
    );
  }

  if (!volunteer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <button 
            onClick={goBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            返回志愿者列表
          </button>
          <h1 className="text-2xl font-bold text-gray-800">志愿者详情</h1>
          <p className="text-gray-500 mt-1">查看志愿者的详细信息和服务记录</p>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 基本信息区域 */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-8">
              {/* 头像 */}
              <div className="w-full md:w-64 flex justify-center md:justify-start">
                <div className="h-48 w-48 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm">
                  <img 
                    src={volunteer.avatarUrl} 
                    alt={volunteer.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              
              {/* 基本信息 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{volunteer.name}</h2>
                  <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                    ${volunteer.role === "TEEN_VOLUNTEER" ? "bg-green-100 text-green-800" : 
                      volunteer.role === "SOCIAL_VOLUNTEER" ? "bg-blue-100 text-blue-800" : 
                      "bg-purple-100 text-purple-800"}`}>
                    {volunteer.roleName}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">性别</p>
                      <p className="text-gray-900">
                        {volunteer.applicationInfo.applicantGender || "未填写"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">年龄</p>
                      <p className="text-gray-900">
                        {volunteer.applicationInfo.applicantAge || "未填写"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">联系电话</p>
                      <p className="text-gray-900">{volunteer.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">邮箱</p>
                      <p className="text-gray-900">{volunteer.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">加入时间</p>
                      <p className="text-gray-900">{volunteer.joinTime}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">最后活动时间</p>
                      <p className="text-gray-900">{volunteer.lastActiveTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 志愿服务时长 */}
          <div className="p-8 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-500" />
              志愿服务时长
            </h3>
            
            <div className="flex items-center">
              <div className="text-4xl font-bold text-gray-900 mr-3">
                {volunteer.totalHours.toFixed(1)}
              </div>
              <div className="text-gray-600">小时</div>
            </div>
          </div>
          
          {/* 近期活动记录 */}
          <div className="p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
              近期志愿服务记录
            </h3>
            
            {volunteer.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {volunteer.recentActivities.map((activity: any) => (
                  <div 
                    key={activity.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{activity.activityName}</h4>
                      <span className="text-sm text-gray-500 mt-1 md:mt-0">
                        {activity.date}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Briefcase className="h-4 w-4 mr-1.5 text-gray-400" />
                        岗位：{activity.positionName}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                        时段：{activity.timeSlot}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                        地点：{activity.location || "未填写"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
                <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900">暂无志愿服务记录</h4>
                <p className="text-gray-500 mt-1">该志愿者尚未参与任何志愿服务活动</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
