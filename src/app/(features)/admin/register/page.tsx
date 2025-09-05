"use client"; // 客户端组件（需 useState、表单提交）

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // 用于跳转登录页（如果有）

// 定义管理员注册表单数据类型
type AdminRegisterForm = {
  name: string;
  phone: string;
  email?: string; // 可选字段
  password: string;
  confirmPassword: string;
};

export default function AdminRegisterPage() {
  const router = useRouter();
  // 表单状态管理
  const [formData, setFormData] = useState<AdminRegisterForm>({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  // 错误提示状态（字段级错误 + 全局错误）
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 加载状态（防止重复提交）
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 注册成功提示
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // 表单输入变化处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // 更新表单数据
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 输入时清除对应字段的错误提示
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // 前端实时验证（提升用户体验）
  const validateField = (name: string, value: string) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value.trim()) error = "姓名不能为空";
        else if (value.trim().length < 2) error = "姓名至少2个字符";
        break;
      case "phone":
        const phoneReg = /^1[3-9]\d{9}$/;
        if (!value.trim()) error = "手机号不能为空";
        else if (!phoneReg.test(value)) error = "请输入有效的11位手机号";
        break;
      case "email":
        if (value.trim()) {
          const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailReg.test(value)) error = "请输入有效的邮箱地址";
        }
        break;
      case "password":
        if (!value) error = "密码不能为空";
        else if (value.length < 6) error = "密码至少6个字符";
        break;
      case "confirmPassword":
        if (value !== formData.password) error = "两次输入的密码不一致";
        break;
    }
    // 更新单个字段的错误提示
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // 表单提交逻辑（调用后端 API）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. 提交前全量验证（避免前端绕过验证）
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = "姓名不能为空且至少2个字符";
    }
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!formData.phone.trim() || !phoneReg.test(formData.phone)) {
      newErrors.phone = "请输入有效的11位手机号";
    }
    if (formData.email && formData.email.trim()) {
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(formData.email)) {
        newErrors.email = "请输入有效的邮箱地址";
      }
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "密码不能为空且至少6个字符";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }

    // 2. 若有验证错误，不提交并显示
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 3. 开始提交（设置加载状态）
    setIsSubmitting(true);
    try {
      // 4. 调用管理员注册 API
      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // 传递表单数据
      });

      const result = await response.json();

      // 5. 处理 API 响应
      if (!response.ok) {
        // 后端返回字段错误（如手机号重复）
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors({ global: result.error || "注册失败，请稍后重试" });
        }
        return;
      }

      // 6. 注册成功：显示提示 + 重置表单
      setRegisterSuccess(true);
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      // 3秒后跳转到登录页（如果有登录页，替换为你的登录页路径）
      setTimeout(() => {
        router.push("/admin/login"); // 假设登录页路径是 /admin/login
      }, 3000);

    } catch (error) {
      // 7. 捕获网络错误
      console.error("注册请求失败：", error);
      setErrors({ global: "网络错误，请检查网络后重试" });
    } finally {
      // 8. 结束提交（关闭加载状态）
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* 页面容器（居中显示） */}
      <div className="w-full max-w-md">
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            管理员注册
          </h1>
          <p className="text-gray-600">测试阶段：直接注册管理员账号，无需审核</p>
        </div>

        {/* 注册成功提示（弹窗） */}
        {registerSuccess && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-8 z-50 w-full max-w-md">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                注册成功！
              </h3>
              <p className="text-gray-600 mb-4">
                即将跳转到管理员登录页（3秒后自动跳转）
              </p>
              <button
                onClick={() => router.push("/admin/login")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full"
              >
                立即登录
              </button>
            </div>
          </div>
        )}

        {/* 注册表单卡片 */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <form onSubmit={handleSubmit}>
            {/* 1. 姓名输入框 */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={(e) => validateField("name", e.target.value)} // 失去焦点时验证
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                }`}
                placeholder="请输入管理员姓名"
                disabled={isSubmitting || registerSuccess}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* 2. 手机号输入框 */}
            <div className="mb-4">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                手机号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onBlur={(e) => validateField("phone", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                }`}
                placeholder="请输入11位手机号"
                disabled={isSubmitting || registerSuccess}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* 3. 邮箱输入框（可选） */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                邮箱（可选）
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ""}
                onChange={handleInputChange}
                onBlur={(e) => validateField("email", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                }`}
                placeholder="请输入邮箱（选填）"
                disabled={isSubmitting || registerSuccess}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* 4. 密码输入框 */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={(e) => validateField("password", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                }`}
                placeholder="请输入至少6位密码"
                disabled={isSubmitting || registerSuccess}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* 5. 确认密码输入框 */}
            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={(e) => validateField("confirmPassword", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                }`}
                placeholder="请再次输入密码"
                disabled={isSubmitting || registerSuccess}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 全局错误提示 */}
            {errors.global && (
              <div className="mb-4 p-2 bg-red-50 text-red-500 rounded-lg text-xs">
                {errors.global}
              </div>
            )}

            {/* 注册按钮 */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSubmitting || registerSuccess}
            >
              {isSubmitting ? "注册中..." : "立即注册"}
            </button>

            {/* 跳转登录页链接（如果有登录页） */}
            <div className="mt-4 text-center text-sm text-gray-600">
              已有管理员账号？{" "}
              <Link
                href="/admin/login"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                前往登录
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}