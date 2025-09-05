"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaPhone, FaLock, FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";

export default function VolunteerLoginPage() {
  const router = useRouter();
  // 表单状态管理（手机号+密码）
  const [formData, setFormData] = useState({
    phone: "", // 志愿者登录用户名=手机号
    password: "",
  });
  // 密码可见性状态
  const [showPassword, setShowPassword] = useState(false);
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

  // 切换密码可见性
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // 表单提交逻辑（调用后端登录 API）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. 前端基础验证
    if (!formData.phone.trim()) {
      setError("请输入手机号");
      return;
    }
    if (!formData.password) {
      setError("请输入密码");
      return;
    }
    // 手机号格式验证（11位数字）
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(formData.phone.trim())) {
      setError("请输入有效的11位手机号");
      return;
    }

    // 2. 开始登录（设置加载状态）
    setIsLoggingIn(true);
    try {
      // 3. 调用后端志愿者登录 API
      const response = await fetch("/api/volunteer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // 传递手机号+密码
      });

      const result = await response.json();

      // 4. 处理 API 响应
      if (!response.ok) {
        // 登录失败：显示后端返回的错误（如“账号不存在”“密码错误”）
        setError(result.error || "登录失败，请检查信息");
        return;
      }

      // 🌟 新增：存储 志愿者信息 + 令牌 到 localStorage（关键！）
      const { volunteerInfo, sessionToken } = result;
      localStorage.setItem("volunteerInfo", JSON.stringify({
        ...volunteerInfo, // 原有信息（id/name/role等）
        sessionToken // 新增：存储令牌，用于后续身份验证
      }));

      // 5. 登录成功：跳转到志愿者活动列表页（而非dashboard，匹配需求）
      router.push("/volunteer/dashboard");

    } catch (error) {
      // 6. 捕获网络错误（如 API 地址错误、网络断开）
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
        {/* 卡片头部（绿色背景，匹配志愿者角色视觉） */}
        <div className="bg-green-600 text-white p-6">
          <div className="flex items-center gap-2 mb-2">
            {/* 返回首页链接 */}
            <Link
              href="/"
              className="hover:text-green-100 transition-colors"
              aria-label="返回首页"
            >
              <FaArrowLeft />
            </Link>
            <h1 className="text-2xl font-bold">志愿者登录</h1>
          </div>
          <p className="text-green-100 text-sm">
            请输入手机号和密码登录系统
          </p>
        </div>

        {/* 登录表单区域 */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. 手机号输入框 */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                手机号
              </label>
              <div className="relative">
                {/* 手机号图标（增强视觉） */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <FaPhone className="h-5 w-5" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入11位手机号"
                  disabled={isLoggingIn}
                  maxLength={11} // 限制输入11位
                />
              </div>
            </div>

            {/* 2. 密码输入框（支持显示/隐藏） */}
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
                {/* 密码可见性切换按钮 */}
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  disabled={isLoggingIn}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" aria-label="隐藏密码" />
                  ) : (
                    <FaEye className="h-5 w-5" aria-label="显示密码" />
                  )}
                </button>
                <input
                  type={showPassword ? "text" : "password"} // 切换输入类型
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入密码"
                  disabled={isLoggingIn}
                />
              </div>
              {/* 密码提示（默认密码来源） */}
              <p className="mt-1 text-xs text-gray-500">
                初始密码为手机号后6位（申请通过后由系统生成）
              </p>
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
              className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "登录中..." : "登录"}
            </button>

            {/* 辅助链接区域 */}
            <div className="flex flex-col gap-2 text-center text-sm text-gray-600">
              {/* 忘记密码（可选，后续可实现密码重置功能） */}
              <Link
                href="/volunteer/forgot-password"
                className="text-green-600 hover:text-green-800 font-medium"
              >
                忘记密码？
              </Link>
              {/* 未提交申请的引导 */}
              <p>
                还未提交志愿者申请？{" "}
                <Link
                  href="/apply"
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  立即申请
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}