"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
// 移除：不再在布局内直接导入 Footer（避免与根布局的 FooterCondition 重复）
import { FaUser, FaSignOutAlt } from "react-icons/fa";

export default function VolunteerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // 关键1：用 useState 存储登录信息，确保服务端客户端初始值一致
  const [volunteerInfo, setVolunteerInfo] = useState<any>(null);
  const isLoginPage = pathname === "/volunteer/login";

  // 关键2：用 useEffect 延迟获取 localStorage（避免服务端客户端数据不一致）
  useEffect(() => {
    const storedInfo = localStorage.getItem("volunteerInfo");
    if (storedInfo) {
      setVolunteerInfo(JSON.parse(storedInfo));
    } else if (!isLoginPage) {
      // 未登录且非登录页，客户端跳转登录页（服务端不执行）
      router.push("/volunteer/login");
    }
  }, [isLoginPage, router]);

  // 退出登录函数
  const handleLogout = () => {
    localStorage.removeItem("volunteerInfo");
    setVolunteerInfo(null);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 关键3：始终渲染 header 容器（解决 Hydration 结构不匹配）
          - 服务端：header 容器存在但无内容
          - 客户端：根据登录状态显示导航内容
          - 服务端与客户端 DOM 结构完全一致 */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        {!isLoginPage && volunteerInfo && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* 左侧：志愿者中心标题 */}
              <div>
                <h1 className="text-xl font-bold text-green-600">志愿者中心</h1>
              </div>
              
              {/* 右侧：用户信息 + 退出按钮 */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                    {volunteerInfo.avatarUrl ? (
                      <img 
                        src={volunteerInfo.avatarUrl} 
                        alt={volunteerInfo.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <FaUser className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden md:inline-block">
                    {volunteerInfo.name}（{roleTextMap[volunteerInfo.role || ""]}）
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  aria-label="退出登录"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 页面内容区（flex-1 确保内容区占满剩余空间，Footer 固定在底部） */}
      <main className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* 关键4：移除布局内的 Footer 渲染
          - Footer 已由根布局的 FooterCondition 统一管理
          - 避免重复渲染两个 Footer */}
    </div>
  );
}

// 角色文本映射（移到组件内，确保作用域正确）
const roleTextMap: Record<string, string> = {
  "TEEN_VOLUNTEER": "青少年志愿者",
  "SOCIAL_VOLUNTEER": "社会志愿者",
  "UNI_VOLUNTEER": "大学生志愿者"
};