import Image from "next/image"
import Link from "next/link"
import { FaUsers, FaUserShield, FaCalendarCheck, FaClock, FaUserPlus } from "react-icons/fa" // 新增 FaUserPlus 图标（用于注册入口）

export default function Home() {
  return (
    <div className="space-y-20 px-4 md:px-6 lg:px-8 py-8">
      {/* 英雄区域（不变） */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/museum-background.jpg"
            alt="博物馆背景"
            fill
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="relative z-10 container mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            博物馆志愿者管理系统
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
            高效管理志愿者申请、排班和工时统计，让博物馆志愿服务更加有序
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/volunteer/login"
              className="bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-opacity-90 transition duration-300"
            >
              登录系统
            </Link>
            <Link
              href="/apply"
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-blue-700 transition duration-300"
            >
              申请成为志愿者
            </Link>
          </div>
        </div>
      </section>

      {/* 功能介绍（不变） */}
      <section className="space-y-12">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">系统功能</h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            为志愿者和管理员提供全方位的服务与管理功能，简化流程，提高效率
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: FaUsers, color: "blue", title: "志愿者申请", desc: "青少年、社会和大学志愿者可便捷提交申请，跟踪审核进度" },
            { icon: FaUserShield, color: "green", title: "管理员审核", desc: "分级管理审核流程，大学管理员和总管理员各有相应权限" },
            { icon: FaCalendarCheck, color: "purple", title: "排班预约", desc: "管理员创建排班计划，志愿者可根据自身情况进行预约" },
            { icon: FaClock, color: "amber", title: "工时统计", desc: "自动记录和计算志愿服务时长，志愿者可随时查看自己的服务记录" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 flex flex-col items-center text-center"
              >
                <div className={`w-14 h-14 mb-4 rounded-full flex items-center justify-center bg-${item.color}-100`}>
                  <Icon className={`text-${item.color}-600 text-2xl`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 角色入口（新增管理员注册入口） */}
      <section className="bg-gray-50 rounded-3xl p-12 shadow-inner">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">用户入口</h2>
        {/* 修改为 3 列布局（适配新增的注册入口），移动端仍为 1 列 */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            // 1. 管理员登录（原有）
            { 
              href: "/admin/login", 
              color: "blue", 
              title: "管理员登录", 
              desc: "博物馆管理员和大学志愿者管理员登录入口", 
              icon: FaUserShield 
            },
            // 2. 管理员注册（新增，测试阶段专用）
            { 
              href: "/admin/register", 
              color: "indigo", // 用靛蓝色区分登录/注册，视觉更清晰
              title: "管理员注册", 
              desc: "测试阶段：管理员账号注册入口（正式环境隐藏）", 
              icon: FaUserPlus // 专用「注册」图标，直观识别
            },
            // 3. 志愿者登录（原有）
            { 
              href: "/volunteer/login", 
              color: "green", 
              title: "志愿者登录", 
              desc: "青少年、社会和大学志愿者登录入口", 
              icon: FaUsers 
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl border border-gray-200 flex flex-col items-center text-center transition-all`}
              >
                <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center bg-${item.color}-600 group-hover:bg-${item.color}-700 transition-colors`}>
                  <Icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}