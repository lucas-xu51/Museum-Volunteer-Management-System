'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronLeft, FaCalendarCheck, FaMapMarkerAlt, FaClock, FaTimesCircle, FaCheckCircle, FaFilter } from 'react-icons/fa';
import { VolunteerReservationItem } from '@/app/api/volunteer/reservations/route';

// 状态筛选枚举
type StatusFilter = 'all' | 'reserved' | 'cancelled' | 'completed';

export default function VolunteerReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<VolunteerReservationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filteredReservations, setFilteredReservations] = useState<VolunteerReservationItem[]>([]);

  // 获取认证Token
  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const volunteerInfo = localStorage.getItem('volunteerInfo');
    return volunteerInfo ? JSON.parse(volunteerInfo).sessionToken : null;
  };

  // 加载报名记录
  const fetchReservations = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/volunteer/login');
        return;
      }

      const response = await fetch('/api/volunteer/reservations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '获取报名记录失败');
      }

      setReservations(data.data);
      setFilteredReservations(data.data);

    } catch (error) {
      setErrorMsg((error as Error).message || '加载失败，请刷新页面重试');
      console.error('获取报名记录错误：', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 取消报名
  const handleCancelReservation = async (reservationId: string) => {
    if (!window.confirm('确定要取消这个活动的报名吗？取消后将无法恢复')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/volunteer/login');
        return;
      }

      const response = await fetch('/api/volunteer/reservations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reservationId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '取消报名失败');
      }

      // 本地更新状态
      setReservations(prev => 
        prev.map(res => 
          res.id === reservationId 
            ? { 
                ...res, 
                status: '已取消', 
                cancelTime: new Date().toLocaleString('zh-CN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                }) 
              } 
            : res
        )
      );

      alert('取消报名成功！');

    } catch (error) {
      alert((error as Error).message || '取消报名失败，请重试');
      console.error('取消报名错误：', error);
    }
  };

  // 状态筛选逻辑
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredReservations(reservations);
    } else if (statusFilter === 'reserved') {
      setFilteredReservations(reservations.filter(res => res.status === '已报名'));
    } else if (statusFilter === 'cancelled') {
      setFilteredReservations(reservations.filter(res => res.status === '已取消'));
    } else if (statusFilter === 'completed') {
      setFilteredReservations(reservations.filter(res => res.status === '已完成'));
    }
  }, [statusFilter, reservations]);

  // 页面加载时获取数据
  useEffect(() => {
    fetchReservations();
  }, [router]);

  // 状态标签样式
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '已报名':
        return 'bg-blue-100 text-blue-700';
      case '已取消':
        return 'bg-red-100 text-red-700';
      case '已完成':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已报名':
        return <FaCalendarCheck className="h-4 w-4 mr-1" />;
      case '已取消':
        return <FaTimesCircle className="h-4 w-4 mr-1" />;
      case '已完成':
        return <FaCheckCircle className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部：返回按钮 + 标题 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/volunteer/events')}
            className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="返回活动列表"
          >
            <FaChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">我的活动报名</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 16a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 筛选区域 */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <FaFilter className="h-5 w-5 text-gray-500" />
            <span className="font-medium">状态筛选：</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: '全部' },
                { value: 'reserved', label: '已报名' },
                { value: 'cancelled', label: '已取消' },
                { value: 'completed', label: '已完成' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as StatusFilter)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-800">{filteredReservations.length}</span> 条记录
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">加载中...请稍候</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无报名记录</h3>
            <p className="text-gray-500 mb-6">您还没有报名任何活动，快去浏览并报名吧！</p>
            <button
              onClick={() => router.push('/volunteer/events')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaCalendarCheck className="h-4 w-4" />
              <span>浏览活动</span>
            </button>
          </div>
        ) : (
          /* 网格布局 - 自适应多列 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredReservations.map((reservation) => (
              <div 
                key={reservation.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
              >
                {/* 活动基本信息 */}
                <div className="p-4 border-b border-gray-100 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(reservation.status)}`}>
                      {getStatusIcon(reservation.status)}
                      {reservation.status}
                    </span>
                    <span className="text-xs text-gray-500">{reservation.reserveTime}</span>
                  </div>
                  
                  <h2 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">{reservation.activity.name}</h2>
                  
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <FaCalendarCheck className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{reservation.activity.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaClock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{reservation.activity.startTime} - {reservation.activity.endTime}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <FaMapMarkerAlt className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{reservation.activity.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{reservation.position.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{reservation.timeSlot}</span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="p-4 bg-gray-50">
                  {reservation.status === '已报名' && (
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 text-sm px-3 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <FaTimesCircle className="h-4 w-4" />
                      <span>取消报名</span>
                    </button>
                  )}
                  
                  {reservation.status === '已取消' && (
                    <button
                      onClick={() => router.push(`/volunteer/events/${reservation.activity.id}`)}
                      className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <FaCalendarCheck className="h-4 w-4" />
                      <span>重新报名</span>
                    </button>
                  )}
                  
                  {reservation.status === '已完成' && (
                    <div className="w-full flex items-center justify-center gap-2 text-green-600 text-sm px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                      <FaCheckCircle className="h-4 w-4" />
                      <span>活动已完成</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}