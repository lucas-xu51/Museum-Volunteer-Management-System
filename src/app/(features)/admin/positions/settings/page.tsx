"use client";

// 必须显式导入 React（解决之前的全局引用错误）
import React, { useState, useEffect } from "react"; 
import { useRouter } from "next/navigation";
import { FaChevronLeft, FaPlusCircle, FaEdit, FaTrashAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { VolunteerType, GenderRestriction } from "@prisma/client";
import PositionFormModal, { FormData } from "./PositionFormModal";

interface VolunteerPosition {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  allowedVolunteerTypes: VolunteerType[];
  genderRestriction: GenderRestriction;
  minAge: number | null;
  maxAge: number | null;
  createdAt: string;
  updatedAt: string;
}

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

export default function AdminPositionSettings() {
  const router = useRouter();
  const [positions, setPositions] = useState<VolunteerPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<FormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 1. 核心修改：将单个ID改为数组，存储所有展开的岗位ID
  const [expandedDescIds, setExpandedDescIds] = useState<string[]>([]);

  // 加载岗位列表（不变）
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/admin/positions");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "获取岗位列表失败");
        setPositions(data);
      } catch (err) {
        setError((err as Error).message);
        console.error("获取岗位失败：", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositions();
  }, []);

  // 打开新增弹窗（不变）
  const handleAddPosition = () => {
    setEditingData(null);
    setError("");
    setIsModalOpen(true);
  };

  // 打开编辑弹窗（不变）
  const handleEditPosition = (position: VolunteerPosition) => {
    setEditingData({
      name: position.name,
      description: position.description,
      allowedVolunteerTypes: [...position.allowedVolunteerTypes],
      genderRestriction: position.genderRestriction,
      minAge: position.minAge,
      maxAge: position.maxAge,
      isActive: position.isActive,
    });
    setError("");
    setIsModalOpen(true);
  };

  // 2. 核心修改：切换展开/收起逻辑（数组操作）
  const toggleDescription = (positionId: string) => {
    setExpandedDescIds((prev) => {
      // 判断当前岗位是否已在展开数组中
      if (prev.includes(positionId)) {
        // 已展开：从数组中移除（收起）
        return prev.filter((id) => id !== positionId);
      } else {
        // 未展开：添加到数组中（展开）
        return [...prev, positionId];
      }
    });
  };

  // 提交表单（不变，仅修改展开状态重置逻辑）
  const handleModalSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const payload = { ...formData };
      let res;

      if (editingData) {
        const editingPosition = positions.find(
          (p) => p.name === editingData.name && p.isActive === editingData.isActive
        );
        if (!editingPosition) throw new Error("未找到编辑的岗位");

        res = await fetch(`/api/admin/positions/${editingPosition.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");

      // 刷新列表后，重置所有展开状态（可选：也可保留展开状态，需匹配新数据ID）
      const updatedRes = await fetch("/api/admin/positions");
      const updatedPositions = await updatedRes.json();
      setPositions(updatedPositions);
      setExpandedDescIds([]); // 重置为空数组（所有收起）

      setIsModalOpen(false);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除岗位（修改：从展开数组中移除已删除的ID）
  const handleDeletePosition = async (id: string) => {
    if (!window.confirm("确定要删除该岗位吗？已关联的排班会受影响！")) return;

    try {
      const res = await fetch(`/api/admin/positions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }

      // 核心修改：如果删除的岗位处于展开状态，从数组中移除
      setExpandedDescIds((prev) => prev.filter((expandedId) => expandedId !== id));
      setPositions(positions.filter((p) => p.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页面头部（不变） */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <FaChevronLeft className="h-5 w-5" />
          <span>返回岗位日历</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800">志愿者岗位设置</h1>

        <button
          onClick={handleAddPosition}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <FaPlusCircle className="h-5 w-5" />
          <span>新增岗位</span>
        </button>
      </div>

      {/* 错误提示（不变） */}
      {error && !isModalOpen && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* 岗位列表：仅修改展开状态判断逻辑 */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">现有志愿者岗位</h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">加载岗位列表中...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>暂无志愿者岗位</p>
            <button
              onClick={handleAddPosition}
              className="mt-4 text-green-600 hover:text-green-800 text-sm font-medium"
            >
              + 点击新增岗位
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">岗位名称</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">允许志愿者类型</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">性别限制</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">年龄范围</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {positions.map((position) => (
                  <React.Fragment key={position.id}>
                    {/* 岗位基本信息行 */}
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {position.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {position.allowedVolunteerTypes.map((type) => (
                          <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            {volunteerTypeMap[type]}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {genderRestrictionMap[position.genderRestriction]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {position.minAge ?? "无"} - {position.maxAge ?? "无"} 岁
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          position.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {position.isActive ? "启用" : "禁用"}
                        </span>
                      </td>
                      {/* 详情按钮：判断逻辑改为数组是否包含当前ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleDescription(position.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1"
                          disabled={!position.description}
                        >
                          {/* 3. 核心修改：判断当前ID是否在展开数组中 */}
                          {expandedDescIds.includes(position.id) ? (
                            <FaChevronUp className="h-4 w-4" />
                          ) : (
                            <FaChevronDown className="h-4 w-4" />
                          )}
                          <span>{expandedDescIds.includes(position.id) ? "收起详情" : "查看详情"}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditPosition(position)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <FaEdit className="h-4 w-4 inline-block mr-1" /> 编辑
                        </button>
                        <button
                          onClick={() => handleDeletePosition(position.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrashAlt className="h-4 w-4 inline-block mr-1" /> 删除
                        </button>
                      </td>
                    </tr>

                    {/* 展开描述行：判断逻辑改为数组是否包含当前ID */}
                    {expandedDescIds.includes(position.id) && position.description && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="text-sm font-medium text-gray-700 min-w-[80px]">岗位描述：</div>
                            <div className="text-sm text-gray-600 whitespace-pre-line">
                              {position.description}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 引入弹窗组件（不变） */}
      <PositionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingData}
        isSubmitting={isSubmitting}
        error={error}
      />
    </div>
  );
}