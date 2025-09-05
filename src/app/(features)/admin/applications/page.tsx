"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// 正确的图标导入（仅保留 react-icons/fa 中存在的图标）
import { 
  FaCheckCircle, FaTimesCircle, FaFilter, 
  FaCalendar, FaUser, FaPhone, 
  FaEnvelope, FaUserTag, FaComment, 
  FaArrowLeft, FaChevronDown, FaListAlt
} from "react-icons/fa";

// 定义申请数据类型（与后端返回结构匹配）
interface Application {
  id: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string | null;
  applicantAge: number;
  applicantGender: string;
  applyType: "TEEN" | "SOCIAL" | "UNIVERSITY";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewBy?: string | null;
  reviewNote?: string | null;
  applyTime: string;
  reviewTime?: string | null;
  reviewer?: {
    id: string;
    name: string;
  } | null;
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [currentAction, setCurrentAction] = useState<"approve" | "reject" | null>(null);
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // 下拉框状态（原生实现）
  const [selectOpen, setSelectOpen] = useState(false);
  
  // 获取当前登录管理员信息
  const adminInfo = JSON.parse(localStorage.getItem("adminInfo") || "null");

  // 验证登录状态
  useEffect(() => {
    if (!adminInfo) {
      router.push("/admin/login");
    }
  }, [router, adminInfo]);

  // 获取申请列表
  const fetchApplications = async () => {
    if (!adminInfo) return;
    
    try {
      setLoading(true);
      setError("");
      // 构建请求URL（带筛选参数）
      const url = selectedStatus === "ALL" 
        ? "/api/admin/applications" 
        : `/api/admin/applications?status=${selectedStatus}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("获取申请列表失败");
      }
      
      const data = await response.json();
      setApplications(data);
    } catch (err) {
      console.error("获取申请失败：", err);
      setError("获取申请列表失败，请刷新页面重试");
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载和状态变化时重新获取
    useEffect(() => {
    // 仅当 adminId 存在时才请求数据（避免未登录时调用）
    if (!adminInfo?.id) return;
    fetchApplications();
    }, [selectedStatus, adminInfo?.id]); // 依赖项改为 adminInfo.id（原始类型）

  // 打开操作对话框
  const handleActionClick = (application: Application, action: "approve" | "reject") => {
    setCurrentApplication(application);
    setCurrentAction(action);
    setReviewNote("");
    setDialogOpen(true);
  };

  // 处理审核操作
  const handleConfirmAction = async () => {
    if (!currentApplication || !currentAction || !adminInfo) return;
    
    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/applications/${currentApplication.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentAction,
          reviewNote: reviewNote.trim() || null,
          adminId: adminInfo.id
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "操作失败");
      }
      
      // 操作成功：显示提示并刷新列表
      setSuccessMessage(result.message + (
        currentAction === "approve" ? `，默认密码为手机号后6位` : ""
      ));
      setDialogOpen(false);
      fetchApplications(); // 刷新申请列表
      
      // 3秒后清除成功提示
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("处理申请失败：", err);
      setError(err instanceof Error ? err.message : "处理申请失败");
    } finally {
      setProcessing(false);
    }
  };

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // 获取状态标签样式（原生Badge）
  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            待审核
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            已批准
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            已拒绝
          </span>
        );
    }
  };

  // 获取申请类型显示文本
  const getApplyTypeText = (type: "TEEN" | "SOCIAL" | "UNIVERSITY") => {
    switch (type) {
      case "TEEN": return "青少年志愿者";
      case "SOCIAL": return "社会志愿者";
      case "UNIVERSITY": return "大学生志愿者";
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载申请列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* 左侧：返回图标按钮 + 标题区域（横向对齐） */}
          <div className="flex items-center gap-4">
            {/* 仅保留返回图标，移除文字 */}
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 transition-colors"
              aria-label="返回仪表盘"
            >
              <FaArrowLeft className="h-4 w-4" />
            </button>
            {/* 原有标题和副标题区域，与图标同行 */}
            <div>
              <h1 className="text-xl font-bold text-gray-800">志愿者申请管理</h1>
              <p className="text-sm text-gray-500">查看和处理所有志愿者申请</p>
            </div>
          </div>
          {/* 右侧：原justify-between保留，此处无其他元素，保持布局平衡 */}
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* 成功提示 */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <FaCheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <FaTimesCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 筛选和统计（原生实现） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <FaFilter className="h-5 w-5 text-gray-500" />
              <h2 className="font-medium text-gray-800">筛选条件</h2>
            </div>
            
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
              {/* 原生下拉框：状态筛选 */}
              <div className="relative w-full sm:w-[180px]">
                <button
                  onClick={() => setSelectOpen(!selectOpen)}
                  className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span>{selectedStatus === "ALL" ? "所有状态" : selectedStatus === "PENDING" ? "待审核" : selectedStatus === "APPROVED" ? "已批准" : "已拒绝"}</span>
                  <FaChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                {/* 下拉选项 */}
                {selectOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-md bg-white shadow-lg z-10">
                    <div className="py-1">
                      {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setSelectedStatus(status as "ALL" | "PENDING" | "APPROVED" | "REJECTED");
                            setSelectOpen(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            selectedStatus === status 
                              ? "bg-blue-100 text-blue-900" 
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {status === "ALL" ? "所有状态" : status === "PENDING" ? "待审核" : status === "APPROVED" ? "已批准" : "已拒绝"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 统计信息 */}
              <div className="text-sm text-gray-600 flex items-center gap-4">
                <span>总申请数: <strong>{applications.length}</strong></span>
                <span>待审核: <strong>{applications.filter(a => a.status === "PENDING").length}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* 申请列表（原生Card） */}
        <div className="grid gap-6">
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FaListAlt className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无申请记录</h3>
                <p className="text-gray-500">没有符合当前筛选条件的志愿者申请记录</p>
              </div>
            </div>
          ) : (
            applications.map((application) => (
              <div 
                key={application.id} 
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 原生CardHeader */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <FaUser className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{application.applicantName}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(application.status)}
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <FaCalendar className="h-4 w-4" />
                        {formatDate(application.applyTime)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 原生CardContent */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FaPhone className="h-4 w-4 text-gray-500" />
                      <span>{application.applicantPhone}</span>
                    </div>
                    {application.applicantEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaEnvelope className="h-4 w-4 text-gray-500" />
                        <span>{application.applicantEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <FaUserTag className="h-4 w-4 text-gray-500" />
                      <span>{getApplyTypeText(application.applyType)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>年龄: {application.applicantAge}岁</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>性别: {application.applicantGender}</span>
                    </div>
                  </div>

                  {/* 审核信息（已处理的申请显示） */}
                  {(application.status === "APPROVED" || application.status === "REJECTED") && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FaComment className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-700">审核信息</span>
                      </div>
                      <p className="text-gray-600 ml-6 mb-1">
                        审核人: {application.reviewer?.name || "未知"}
                      </p>
                      <p className="text-gray-600 ml-6 mb-1">
                        审核时间: {application.reviewTime ? formatDate(application.reviewTime) : "未知"}
                      </p>
                      {application.reviewNote && (
                        <p className="text-gray-600 ml-6">
                          审核备注: {application.reviewNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 操作按钮（仅对待审核申请显示） */}
                  {application.status === "PENDING" && (
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => handleActionClick(application, "reject")}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1"
                      >
                        <FaTimesCircle className="h-4 w-4" />
                        <span>拒绝</span>
                      </button>
                      <button
                        onClick={() => handleActionClick(application, "approve")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                      >
                        <FaCheckCircle className="h-4 w-4" />
                        <span>同意</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 原生Dialog：审核操作弹窗 */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full mx-auto">
            {/* DialogHeader */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentAction === "approve" ? "批准申请" : "拒绝申请"}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="关闭"
              >
                <FaListAlt className="h-5 w-5" />
              </button>
            </div>
            
            {/* DialogContent */}
            <div className="px-6 py-4">
              {currentApplication && (
                <div className="py-2">
                  <p className="text-sm text-gray-600 mb-4">
                    确定要{currentAction === "approve" ? "批准" : "拒绝"} 
                    <span className="font-medium text-gray-900"> {currentApplication.applicantName}</span>
                    的{getApplyTypeText(currentApplication.applyType)}申请吗？
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      审核备注（可选）
                    </label>
                    <textarea
                      placeholder={currentAction === "approve" ? "请输入批准备注（可选）" : "请输入拒绝原因（可选）"}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="min-h-[100px] w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* DialogFooter */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                disabled={processing}
              >
                取消
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={processing}
                className={`px-4 py-2 rounded-lg text-white text-sm ${
                  currentAction === "approve" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processing ? "处理中..." : currentAction === "approve" ? "确认批准" : "确认拒绝"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}