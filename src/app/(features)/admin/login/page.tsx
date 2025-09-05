"use client"; // 客户端组件（需 useState、表单提交、路由跳转）

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaLock, FaUser, FaArrowLeft } from "react-icons/fa"; // 图标用于增强视觉

export default function AdminLoginPage() {
  const router = useRouter();
  // 表单状态管理（用户名=手机号，密码）
  const [formData, setFormData] = useState({
    username: "", // 用户名即手机号
    password: "",
  });
  // 错误提示状态
  const [error, setError] = useState("");
  // 加载状态（防止重复提交）
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 表单输入变化处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 输入时清除错误提示
    if (error) setError("");
  };

  // 表单提交逻辑（调用后端登录 API）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. 前端基础验证
    if (!formData.username.trim()) {
      setError("请输入用户名（手机号）");
      return;
    }
    if (!formData.password) {
      setError("请输入密码");
      return;
    }
    // 手机号格式验证（可选，提升用户体验）
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(formData.username.trim())) {
      setError("请输入有效的11位手机号作为用户名");
      return;
    }

    // 2. 开始登录（设置加载状态）
    setIsLoggingIn(true);
    try {
      // 3. 调用后端登录 API
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // 传递用户名+密码
      });

      const result = await response.json();

      // 4. 处理 API 响应
      if (!response.ok) {
        // 登录失败：显示后端返回的错误（如“管理员不存在”“密码错误”）
        setError(result.error || "登录失败，请检查信息");
        return;
      }

      // 5. 登录成功：
      // - （可选）存储管理员信息到 localStorage，便于后续页面使用
      localStorage.setItem("adminInfo", JSON.stringify(result.adminInfo));
      // - 跳转到管理员首页（假设管理员首页路径是 /admin/dashboard）
      router.push("/admin/dashboard");

    } catch (error) {
      // 6. 捕获网络错误
      console.error("登录请求失败：", error);
      setError("网络错误，请检查网络后重试");
    } finally {
      // 7. 结束登录（关闭加载状态）
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {/* 登录卡片容器（居中显示，限制最大宽度） */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* 卡片头部（蓝色背景，标题+返回链接） */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center gap-2 mb-2">
            {/* 返回首页链接 */}
            <Link
              href="/"
              className="hover:text-blue-100 transition-colors"
              aria-label="返回首页"
            >
              <FaArrowLeft />
            </Link>
            <h1 className="text-2xl font-bold">管理员登录</h1>
          </div>
          <p className="text-blue-100 text-sm">
            请输入手机号和密码登录系统
          </p>
        </div>

        {/* 登录表单区域 */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. 用户名输入框（手机号） */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                用户名（手机号）
              </label>
              <div className="relative">
                {/* 用户名图标（增强视觉） */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <FaUser className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入11位手机号"
                  disabled={isLoggingIn}
                />
              </div>
            </div>

            {/* 2. 密码输入框 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                密码
              </label>
              <div className="relative">
                {/* 密码图标（增强视觉） */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <FaLock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入密码"
                  disabled={isLoggingIn}
                />
              </div>
            </div>

            {/* 错误提示（红色文本） */}
            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "登录中..." : "登录"}
            </button>

            {/* 跳转注册页面链接（测试阶段） */}
            <div className="text-center text-sm text-gray-600">
              还没有管理员账号？{" "}
              <Link
                href="/admin/register"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                前往注册
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}