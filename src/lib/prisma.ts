import { PrismaClient } from '@prisma/client'

// 全局变量用于防止在开发环境中多次实例化PrismaClient
declare global {
  var prisma: PrismaClient | undefined
}

// 创建Prisma客户端实例
export const prisma = global.prisma || new PrismaClient()

// 在开发环境中，将实例挂载到全局变量
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
