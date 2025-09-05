# 博物馆志愿者管理系统

基于Next.js、TypeScript、PostgreSQL和Prisma的博物馆志愿者管理系统，使用Docker进行容器化部署。

## 功能概述

- 志愿者管理：支持青少年、社会和大学志愿者的申请与管理
- 分级审核：大学志愿者管理员和总管理员拥有不同的审核权限
- 排班与预约：管理员创建排班计划，志愿者可进行预约
- 打卡与工时统计：记录志愿者服务时间，自动计算总时长

## 技术栈

- 前端/后端框架：Next.js 14 (App Router)
- 编程语言：TypeScript
- 数据库：PostgreSQL
- ORM：Prisma
- 样式：Tailwind CSS
- 容器化：Docker & Docker Compose

## 快速开始

### 前提条件

- Docker 和 Docker Compose 已安装
- Git 已安装

### 安装步骤

1. 克隆仓库
git clone <仓库地址>
cd museum-volunteer-system
2. 配置环境变量
cp .env.example .env
# 根据需要修改.env文件中的配置
3. 启动服务
docker-compose up -d
4. 访问系统

打开浏览器，访问 http://localhost:3000

### 开发指南

1. 进入容器
docker exec -it museum-volunteer-web sh
2. 数据库迁移
npx prisma migrate dev --name <迁移名称>
3. 数据库可视化
npx prisma studio
然后访问 http://localhost:5555 查看数据库

## 项目结构

- `/src/app` - Next.js 14 App Router 页面和布局
- `/src/components` - 可复用组件
- `/src/lib` - 工具函数和Prisma客户端
- `/prisma` - Prisma模型和迁移文件
- `/public` - 静态资源

## 后续开发计划

1. 实现用户认证系统（登录/注册）
2. 开发志愿者申请和审核功能
3. 实现排班和预约功能
4. 开发打卡和工时统计功能
5. 添加管理员控制面板