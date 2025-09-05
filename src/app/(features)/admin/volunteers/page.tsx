"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";

// 配置axios默认设置
axios.defaults.withCredentials = true;

// 类型定义
interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  roleName: string;
  avatarUrl: string;
  createdAt: string;
  totalHours: number;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface VolunteersResponse {
  data: Volunteer[];
  pagination: Pagination;
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [search, setSearch] = useState("");
  const router = useRouter();

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

  // 获取志愿者列表
  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError("");

      const adminToken = getAdminToken();
      console.log("当前管理员Token:", adminToken ? "存在" : "不存在");

      if (!adminToken) {
        setError("请先登录管理员账号");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
        return;
      }

      const response = await axios.get<VolunteersResponse>(
        `/api/admin/volunteers?page=${pagination.page}&pageSize=${pagination.pageSize}&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`
          }
        }
      );

      setVolunteers(response.data.data);
      setPagination(response.data.pagination);
    } catch (err: any) {
      console.error("获取志愿者列表错误:", err);

      if (err.response?.status === 401) {
        setError("登录已过期，请重新登录");
        localStorage.removeItem("adminInfo");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
      } else {
        setError(err.response?.data?.error || "获取志愿者列表失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和参数变化时重新请求
  useEffect(() => {
    fetchVolunteers();
  }, [pagination.page, pagination.pageSize, search, router]);

  // 分页处理
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchVolunteers();
  };

  return (
    <div className="container mx-auto py-8 px-4">

      <button
        onClick={() => router.push("http://localhost:3000/admin/dashboard")}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4"
        aria-label="返回仪表盘"
        type="button"
      >
        {/* 原生SVG箭头图标，无需导入任何库 */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <span>返回仪表盘</span>
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">志愿者管理</h1>

      {/* 搜索表单 */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索姓名、电话或邮箱"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-r hover:bg-blue-600 transition-colors"
        >
          搜索
        </button>
      </form>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-6 rounded-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-600">加载志愿者数据中...</p>
        </div>
      ) : (
        <>
          {/* 志愿者列表 */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    姓名
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    电话
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    累计时长(小时)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {volunteers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      暂无志愿者数据
                    </td>
                  </tr>
                ) : (
                  volunteers.map((volunteer) => (
                    <tr key={volunteer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* 头像 */}
                          <div className="h-8 w-8 rounded-full overflow-hidden mr-3">
                            <img
                              src={volunteer.avatarUrl || "/default-avatar.png"}
                              alt={volunteer.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {volunteer.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {volunteer.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {volunteer.email || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${volunteer.role === UserRole.TEEN_VOLUNTEER ? 'bg-green-100 text-green-800' : 
                            volunteer.role === UserRole.SOCIAL_VOLUNTEER ? 'bg-blue-100 text-blue-800' : 
                            'bg-purple-100 text-purple-800'}`}>
                          {volunteer.roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(volunteer.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {volunteer.totalHours.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <a
                          href={`/admin/volunteers/${volunteer.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看详情
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页控件 */}
          <div className="flex justify-between items-center mt-6 px-2">
            <div className="text-sm text-gray-600">
              共 <span className="font-medium">{pagination.total}</span> 名志愿者，
              当前第 <span className="font-medium">{pagination.page}</span>/
              <span className="font-medium">{pagination.totalPages}</span> 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 
                  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 
                  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
    