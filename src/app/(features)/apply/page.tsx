"use client"; // 标记为客户端组件（需使用 useState、表单提交等客户端特性）

import { useState } from "react";
import { useRouter } from "next/navigation";
// 1. 删除 Prisma 相关导入（客户端不再需要）
// import { PrismaClient, VolunteerType } from "@prisma/client";
// const prisma = new PrismaClient();

// 定义表单数据类型（与后端 API 接收格式对应，无需关联 Prisma 枚举）
type ApplyFormData = {
  name: string;
  gender: "男" | "女" | "其他";
  phone: string;
  email?: string; // 可选字段
  age: number;
  volunteerType: "TEEN" | "UNIVERSITY" | "SOCIAL"; // 与后端 VolunteerType 枚举值匹配
};

export default function VolunteerApplyPage() {
  const router = useRouter();
  // 表单状态管理（不变）
  const [formData, setFormData] = useState<ApplyFormData>({
    name: "",
    gender: "男",
    phone: "",
    email: "",
    age: 18, // 默认年龄
    volunteerType: "TEEN", // 默认志愿者类型（青少年）
  });
  // 错误提示状态（不变）
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 加载状态（防止重复提交，不变）
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 提交成功提示（不变）
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 表单输入变化处理（不变）
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // 特殊处理：age 转为数字类型
    if (name === "age") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    // 输入时清除对应字段的错误提示
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // 表单验证逻辑（不变，前端先做基础验证，后端会二次验证）
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    // 姓名：必填，至少2个字符
    if (!formData.name.trim()) {
      newErrors.name = "姓名不能为空";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "姓名至少2个字符";
    }
    // 手机号：必填，11位数字
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = "手机号不能为空";
    } else if (!phoneReg.test(formData.phone.trim())) {
      newErrors.phone = "请输入有效的11位手机号";
    }
    // 年龄：12-65岁（合理的志愿者年龄范围）
    if (formData.age < 12 || formData.age > 65) {
      newErrors.age = "年龄需在12-65岁之间";
    }
    // 邮箱：可选，但填写时需符合格式
    if (formData.email && formData.email.trim()) {
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(formData.email.trim())) {
        newErrors.email = "请输入有效的邮箱地址";
      }
    }

    // 更新错误提示
    setErrors(newErrors);
    // 无错误则验证通过
    return Object.keys(newErrors).length === 0;
  };

  // 2. 关键修改：表单提交逻辑改为调用后端 API（删除 Prisma 操作）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. 表单验证
    if (!validateForm()) return;
    // 2. 开始提交（设置加载状态）
    setIsSubmitting(true);
    try {
      // 3. 调用后端 API（传递表单数据）
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // 告诉后端数据格式为 JSON
        },
        body: JSON.stringify(formData), // 表单数据转为 JSON 字符串
      });

      // 4. 解析后端返回结果
      const result = await response.json();

      // 5. 处理 API 响应（根据状态码判断成功/失败）
      if (!response.ok) {
        // 后端返回错误（如手机号重复、数据无效）
        if (result.error.includes("手机号")) {
          // 手机号重复错误，显示在手机号字段下方
          setErrors((prev) => ({ ...prev, phone: result.error }));
        } else if (result.error.includes("姓名") || result.error.includes("年龄") || result.error.includes("邮箱")) {
          // 其他字段验证错误，显示对应提示
          setErrors((prev) => ({ ...prev, global: result.error }));
        } else {
          // 未知错误
          setErrors((prev) => ({ ...prev, global: "提交失败，请稍后重试" }));
        }
        return;
      }

      // 6. 提交成功：重置表单 + 显示成功提示
      setFormData({
        name: "",
        gender: "男",
        phone: "",
        email: "",
        age: 18,
        volunteerType: "TEEN",
      });
      setSubmitSuccess(true);
      // 3秒后跳转到首页
      setTimeout(() => {
        router.push("/");
      }, 3000);

    } catch (error) {
      // 7. 捕获网络错误（如 API 地址错误、网络断开）
      console.error("申请提交失败（网络错误）：", error);
      setErrors((prev) => ({ ...prev, global: "网络错误，请检查网络后重试" }));
    } finally {
      // 8. 结束提交（关闭加载状态，无论成功/失败）
      setIsSubmitting(false);
    }
  };

  // 页面渲染部分（完全不变，保留所有样式和交互）
  return (
    <div className="min-h-screen flex flex-col">
      {/* 主要内容区 */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
              志愿者申请
            </h1>
            <p className="text-gray-600">
              填写以下信息，加入我们的志愿者团队，一起传播文化的力量
            </p>
          </div>

          {/* 提交成功提示（弹窗） */}
          {submitSuccess && (
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
                  申请提交成功！
                </h3>
                <p className="text-gray-600 mb-4">
                  我们将在3个工作日内审核您的申请，审核结果将通过短信通知您
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full"
                >
                  返回首页
                </button>
              </div>
            </div>
          )}

          {/* 表单卡片 */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
            <form onSubmit={handleSubmit}>
              {/* 1. 姓名输入框 */}
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-gray-700 font-medium mb-2"
                >
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入您的真实姓名"
                  disabled={isSubmitting || submitSuccess}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* 2. 性别选择 */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  性别 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  {["男", "女", "其他"].map((gender) => (
                    <label
                      key={gender}
                      className="flex items-center cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={formData.gender === gender}
                        onChange={handleInputChange}
                        className="mr-2 text-blue-600"
                        disabled={isSubmitting || submitSuccess}
                      />
                      <span className="text-gray-700">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. 手机号输入框 */}
              <div className="mb-6">
                <label
                  htmlFor="phone"
                  className="block text-gray-700 font-medium mb-2"
                >
                  手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入11位手机号（用于接收审核通知）"
                  disabled={isSubmitting || submitSuccess}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* 4. 邮箱输入框（可选） */}
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-gray-700 font-medium mb-2"
                >
                  邮箱（可选）
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入您的邮箱（选填）"
                  disabled={isSubmitting || submitSuccess}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* 5. 年龄输入框 */}
              <div className="mb-6">
                <label
                  htmlFor="age"
                  className="block text-gray-700 font-medium mb-2"
                >
                  年龄 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="12"
                  max="65"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.age ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  placeholder="请输入您的年龄"
                  disabled={isSubmitting || submitSuccess}
                />
                {errors.age && (
                  <p className="text-red-500 text-sm mt-1">{errors.age}</p>
                )}
              </div>

              {/* 6. 志愿者类型选择 */}
              <div className="mb-8">
                <label
                  htmlFor="volunteerType"
                  className="block text-gray-700 font-medium mb-2"
                >
                  志愿者类型 <span className="text-red-500">*</span>
                </label>
                <select
                  id="volunteerType"
                  name="volunteerType"
                  value={formData.volunteerType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.volunteerType ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                  }`}
                  disabled={isSubmitting || submitSuccess}
                >
                  <option value="TEEN">青少年志愿者（12-18岁）</option>
                  <option value="UNIVERSITY">大学生志愿者（18-25岁）</option>
                  <option value="SOCIAL">社会志愿者（25岁以上）</option>
                </select>
                {errors.volunteerType && (
                  <p className="text-red-500 text-sm mt-1">{errors.volunteerType}</p>
                )}
              </div>

              {/* 全局错误提示 */}
              {errors.global && (
                <div className="mb-6 p-3 bg-red-50 text-red-500 rounded-lg text-sm">
                  {errors.global}
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full text-lg"
                disabled={isSubmitting || submitSuccess}
              >
                {isSubmitting 
                  ? "提交中..." 
                  : submitSuccess 
                    ? "提交成功" 
                    : "提交申请"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}