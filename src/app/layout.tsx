import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// 导入条件判断组件（替代直接导入 Header 和 Footer）
import HeaderCondition from '../components/HeaderCondition';
import FooterCondition from '../components/FooterCondition';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '博物馆志愿者管理系统',
  description: '管理博物馆志愿者申请、排班和工时统计的系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* 条件显示 Header */}
          <HeaderCondition />
          
          <main className="flex-grow container mx-auto space-y-12">
            {children}
          </main>
          
          {/* 条件显示 Footer */}
          <FooterCondition />
        </div>
      </body>
    </html>
  );
}

