// src/app/(features)/admin/positions/settings/PositionFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { FaSave, FaWindowClose } from "react-icons/fa";
import { VolunteerType, GenderRestriction } from "@prisma/client";

// 1. 删除 Props 中与 maxNum 相关的定义
interface PositionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  initialData: FormData | null;
  isSubmitting: boolean;
  error: string;
}

// 2. 删除 FormData 中的 maxNum 字段
export type FormData = {
  name: string;
  description: string | null;
  allowedVolunteerTypes: VolunteerType[]; // 移除 maxNum
  genderRestriction: GenderRestriction;
  minAge: number | null;
  maxAge: number | null;
  isActive: boolean;
};

// 枚举中文映射（不变）
const volunteerTypeMap = {
  TEEN: "青少年志愿者",
  SOCIAL: "社会志愿者",
  UNIVERSITY: "大学生志愿者",
};

const genderRestrictionMap = {
  MALE: "仅男性",
  FEMALE: "仅女性",
  UNRESTRICTED: "无限制",
};

// 3. 初始化表单状态时删除 maxNum
const getInitialFormState = (): FormData => ({
  name: "",
  description: null,
  allowedVolunteerTypes: [],
  genderRestriction: "UNRESTRICTED",
  minAge: null,
  maxAge: null,
  isActive: true,
});

export default function PositionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  error,
}: PositionFormModalProps) {
  const [formData, setFormData] = useState<FormData>(getInitialFormState());

  // 监听 initialData 变化（不变，但初始数据已无 maxNum）
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || getInitialFormState());
    }
  }, [isOpen, initialData]);

  // 表单输入变化处理：删除 maxNum 相关判断
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: 
        // 仅保留 minAge/maxAge 的数字处理，删除 maxNum
        (name === "minAge" || name === "maxAge") 
          ? (value.trim() ? Number(value) : null) 
          : 
        (name === "description" && type === "textarea")
          ? (value.trim() || null)
          : 
        value,
    }));
  };

  // 多选框逻辑（不变）
  const handleVolunteerTypeChange = (type: VolunteerType) => {
    setFormData((prev) => ({
      ...prev,
      allowedVolunteerTypes: prev.allowedVolunteerTypes.includes(type)
        ? prev.allowedVolunteerTypes.filter((t) => t !== type)
        : [...prev.allowedVolunteerTypes, type],
    }));
  };

  // 4. 表单提交验证：删除 maxNum 相关验证
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("请输入岗位名称");
      return;
    }
    // 删除：if (formData.maxNum < 1) { ... } 验证
    if (formData.allowedVolunteerTypes.length === 0) {
      alert("请至少选择一种允许的志愿者类型");
      return;
    }
    if (formData.minAge !== null && formData.maxAge !== null && formData.minAge > formData.maxAge) {
      alert("最小年龄不能大于最大年龄");
      return;
    }

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 弹窗头部（不变） */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">
            {initialData ? "编辑岗位" : "新增志愿者岗位"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 错误提示（不变） */}
        {error && (
          <div className="px-6 py-3 bg-red-50 text-red-600 rounded-b-lg flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* 弹窗表单：5. 删除“最大人数”表单字段 */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {/* 岗位名称（不变） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              岗位名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="如：引导员、讲解员、保安"
              disabled={isSubmitting}
            />
          </div>

          {/* 岗位描述（不变） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              岗位描述
            </label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="描述岗位职责、工作内容等"
              disabled={isSubmitting}
            ></textarea>
          </div>

          {/* 删除：最大人数 表单字段 */}

          {/* 允许的志愿者类型（不变） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              允许申请的志愿者类型 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(volunteerTypeMap).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowedVolunteerTypes.includes(value as VolunteerType)}
                    onChange={() => handleVolunteerTypeChange(value as VolunteerType)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 后续字段（性别限制、年龄范围、岗位状态）均不变 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              性别限制
            </label>
            <select
              name="genderRestriction"
              value={formData.genderRestriction}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            >
              {Object.entries(genderRestrictionMap).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最小年龄（可选）
              </label>
              <input
                type="number"
                name="minAge"
                value={formData.minAge || ""}
                onChange={handleInputChange}
                placeholder="无限制"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大年龄（可选）
              </label>
              <input
                type="number"
                name="maxAge"
                value={formData.maxAge || ""}
                onChange={handleInputChange}
                placeholder="无限制"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm font-medium text-gray-700">启用该岗位</span>
            </label>
          </div>

          {/* 提交按钮（不变） */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              <FaWindowClose className="h-4 w-4 inline-block mr-1" /> 取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? (
                <span className="inline-block animate-spin h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
              ) : (
                <FaSave className="h-4 w-4 inline-block mr-1" />
              )}
              {initialData ? "更新岗位" : "创建岗位"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}