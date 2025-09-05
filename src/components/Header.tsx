"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { FaBars, FaTimes } from "react-icons/fa"

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md backdrop-blur-sm transition-shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo和网站名称 */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 relative transition-transform group-hover:scale-110">
              <Image
                src="/museum-logo.svg"
                alt="博物馆logo"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <span className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
              博物馆志愿者管理系统
            </span>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: "/", label: "首页" },
              { href: "/about", label: "关于我们" },
              { href: "/positions", label: "志愿岗位" },
              { href: "/faq", label: "常见问题" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-600 hover:text-blue-600 transition-colors relative after:content-[''] after:block after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/volunteer/login"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
              登录
            </Link>
          </nav>

          {/* 移动端菜单按钮 */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>

      {/* 移动端导航菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {[
              { href: "/", label: "首页" },
              { href: "/about", label: "关于我们" },
              { href: "/positions", label: "志愿岗位" },
              { href: "/faq", label: "常见问题" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-gray-700 hover:text-blue-600 transition-colors text-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/volunteer/login"
              className="block bg-blue-600 text-white px-4 py-2 rounded-lg text-center shadow hover:bg-blue-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              登录
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
