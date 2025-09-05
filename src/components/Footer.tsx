import Link from 'next/link'
import { FaFacebook, FaTwitter, FaInstagram, FaWeixin, FaWeibo } from 'react-icons/fa'

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-12 mt-12">
      <div className="container mx-auto px-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">博物馆志愿者管理系统</h3>
            <p className="text-gray-400 text-sm">
              为博物馆和志愿者提供高效、便捷的志愿服务管理
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">首页</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">关于我们</Link></li>
              <li><Link href="/positions" className="hover:text-white transition-colors">志愿岗位</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">常见问题</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">联系我们</h3>
            <ul className="space-y-2 text-gray-400">
              <li>电话：400-123-4567</li>
              <li>邮箱：volunteer@museum.example.com</li>
              <li>地址：北京市海淀区博物馆路100号</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">关注我们</h3>
            <div className="flex space-x-4 text-gray-400">
              <FaWeixin size={20} className="hover:text-white transition-colors"/>
              <FaWeibo size={20} className="hover:text-white transition-colors"/>
              <FaFacebook size={20} className="hover:text-white transition-colors"/>
              <FaTwitter size={20} className="hover:text-white transition-colors"/>
              <FaInstagram size={20} className="hover:text-white transition-colors"/>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} 博物馆志愿者管理系统 版权所有
        </div>
      </div>
    </footer>
  )
}

export default Footer
