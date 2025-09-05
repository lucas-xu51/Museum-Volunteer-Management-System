"use client";

import React, { useState, useEffect } from "react";
import { VolunteerPosition } from "@prisma/client";

// 定义单个岗位的人数配置类型
export type ActivityPositionConfig = {
  positionId: string;
  positionName: string;
  count: number; // 该岗位需要的人数
};

// 定义 Modal 接收的 props 类型
interface AdminActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ActivityFormData, "id">) => void;
  selectedDate: string; // 当前选中的日期（YYYY-MM-DD）
  timeSlots: string[]; // 7:00-19:00 时间段
  positions: VolunteerPosition[]; // 所有可选岗位列表
  initialData?: Omit<ActivityFormData, "id">; // 编辑时的初始数据（可选）
}

// 定义活动表单数据类型（含岗位配置）
export type ActivityFormData = {
  id?: string; // 编辑时需要，新增时可选
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  positions: ActivityPositionConfig[]; // 岗位-人数配置（替代原总人数）
  location: string;
  description: string;
};

export default function AdminActivityModal({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  timeSlots,
  positions,
  initialData,
}: AdminActivityModalProps) {
  // 表单状态：默认值或初始数据（编辑时）
  const [formData, setFormData] = useState<Omit<ActivityFormData, "id">>({
    name: "",
    date: selectedDate,
    startTime: "07:00",
    endTime: "08:00",
    positions: [], // 初始无岗位，需用户添加
    location: "",
    description: "",
  });

  // 编辑时：同步初始数据到表单
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData);
    }
    // 关闭时重置表单 - 修复：检查initialData是否存在
    if (!isOpen) {
      setFormData({
        name: initialData?.name || "", // 使用可选链操作符避免错误
        date: selectedDate,
        startTime: "07:00",
        endTime: "08:00",
        positions: [],
        location: "",
        description: "",
      });
    }
  }, [isOpen, initialData, selectedDate]);

  // 处理基础表单输入变化（日期、时间、地点、描述）
  const handleBasicInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 新增一个岗位配置项
  const handleAddPositionConfig = () => {
    if (positions.length === 0) {
      alert("暂无可用岗位，请先在「岗位设置」中创建岗位");
      return;
    }
    // 默认选中第一个岗位，人数1
    const defaultPosition = positions[0];
    setFormData((prev) => ({
      ...prev,
      positions: [
        ...prev.positions,
        {
          positionId: defaultPosition.id,
          positionName: defaultPosition.name,
          count: 1,
        },
      ],
    }));
  };

  // 修改岗位选择（切换岗位）
  const handlePositionChange = (
    index: number,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedPositionId = e.target.value;
    const selectedPosition = positions.find(p => p.id === selectedPositionId);
    if (!selectedPosition) return;

    setFormData((prev) => {
      const newPositions = [...prev.positions];
      newPositions[index] = {
        ...newPositions[index],
        positionId: selectedPosition.id,
        positionName: selectedPosition.name,
      };
      return { ...prev, positions: newPositions };
    });
  };

  // 修改岗位人数
  const handlePositionCountChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const count = Math.max(1, Number(e.target.value)); // 人数至少1
    setFormData((prev) => {
      const newPositions = [...prev.positions];
      newPositions[index].count = count;
      return { ...prev, positions: newPositions };
    });
  };

  // 删除单个岗位配置项
  const handleDeletePositionConfig = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions.filter((_, i) => i !== index),
    }));
  };

  // 表单提交验证
  const handleFormSubmit = () => {
    // 1. 基础字段验证
    if (!formData.name.trim() || !formData.location || !formData.description) {
      alert("请填写「活动名称」、「活动地点」和「活动描述」");
      return;
    }
    // 2. 时间逻辑验证
    if (formData.startTime >= formData.endTime) {
      alert("结束时间必须晚于开始时间");
      return;
    }
    // 3. 岗位配置验证（至少一个岗位，且每个岗位人数≥1）
    if (formData.positions.length === 0) {
      alert("请至少添加一个需要的岗位");
      return;
    }
    const hasInvalidCount = formData.positions.some(p => p.count < 1);
    if (hasInvalidCount) {
      alert("每个岗位的需求人数不能小于1");
      return;
    }

    // 验证通过，提交数据
    onSubmit(formData);
    onClose(); // 关闭弹窗
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 弹窗头部 */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">
            {initialData ? "编辑活动" : `添加 ${selectedDate} 活动`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭弹窗"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 弹窗表单 */}
        <div className="p-6 space-y-6">
          {/* 活动名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleBasicInputChange}
              placeholder="例如：周末讲座、展厅宣传活动、志愿者培训"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 1. 时间段选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间 <span className="text-red-500">*</span>
              </label>
              <select
                name="startTime"
                value={formData.startTime}
                onChange={handleBasicInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间 <span className="text-red-500">*</span>
              </label>
              <select
                name="endTime"
                value={formData.endTime}
                onChange={handleBasicInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. 岗位-人数配置 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                岗位需求配置 <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddPositionConfig}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                添加岗位
              </button>
            </div>

            {/* 岗位配置列表 */}
            {formData.positions.length === 0 ? (
              <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                点击「添加岗位」配置各岗位需求人数
              </div>
            ) : (
              <div className="space-y-3">
                {formData.positions.map((config, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    {/* 岗位选择下拉框 */}
                    <select
                      value={config.positionId}
                      onChange={(e) => handlePositionChange(index, e)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {positions.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>

                    {/* 人数输入框 */}
                    <input
                      type="number"
                      value={config.count}
                      onChange={(e) => handlePositionCountChange(index, e)}
                      min="1"
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    {/* 删除按钮 */}
                    <button
                      type="button"
                      onClick={() => handleDeletePositionConfig(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      aria-label="删除该岗位配置"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 活动地点 & 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动地点 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleBasicInputChange}
              placeholder="例如：博物馆大厅、展厅A、入口处"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleBasicInputChange}
              rows={3}
              placeholder="例如：引导游客扫码、展品讲解、维护展厅秩序"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              required
            ></textarea>
          </div>

          {/* 提交按钮 */}
          <button
            type="button"
            onClick={handleFormSubmit}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {initialData ? "更新活动" : "保存活动"}
          </button>
        </div>
      </div>
    </div>
  );
}
    