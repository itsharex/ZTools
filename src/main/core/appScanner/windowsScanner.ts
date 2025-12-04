import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import { shell } from 'electron'
import { App } from './types'

const isZhRegex = /[\u4e00-\u9fa5]/

// 图标缓存目录
const iconDir = path.join(os.tmpdir(), 'ProcessIcon')

// 确保图标目录存在
async function ensureIconDir(): Promise<void> {
  try {
    await fsPromises.mkdir(iconDir, { recursive: true })
  } catch (error) {
    console.error('创建图标目录失败:', error)
  }
}

// 提取并保存应用图标
async function extractIcon(appPath: string, appName: string): Promise<string> {
  // 将不安全的文件名字符替换为下划线，保持可读性
  const safeFileName = appName.replace(/[<>:"/\\|?*]/g, '_')
  const iconPath = path.join(iconDir, `${safeFileName}.png`)

  try {
    // 检查图标是否已存在
    const exists = fs.existsSync(iconPath)
    if (exists) {
      return iconPath
    }

    // 使用 extract-file-icon 提取图标
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fileIcon = require('extract-file-icon')
    const buffer = fileIcon(appPath, 32)

    // 保存图标
    await fsPromises.writeFile(iconPath, buffer, 'base64')
    return iconPath
  } catch (error) {
    console.error(`提取图标失败 ${appName}:`, error)
    return iconPath // 返回路径，即使提取失败
  }
}

// 递归扫描目录中的快捷方式
async function scanDirectory(dirPath: string, apps: App[]): Promise<void> {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        // 递归扫描子目录
        await scanDirectory(fullPath, apps)
      } else if (entry.isFile() && entry.name.endsWith('.lnk')) {
        // 处理快捷方式文件
        try {
          const appName = path.basename(entry.name, '.lnk')

          // 读取快捷方式详情
          const shortcutDetails = shell.readShortcutLink(fullPath)

          // 跳过没有目标或卸载程序的快捷方式
          if (!shortcutDetails.target || shortcutDetails.target.toLowerCase().includes('unin')) {
            continue
          }

          // 提取图标
          const icon = await extractIcon(shortcutDetails.target, appName)

          // 生成关键词
          const keywords = [appName]

          // 添加可执行文件名作为关键词
          keywords.push(path.basename(shortcutDetails.target, '.exe'))

          // 处理中文名称 (拼音支持已注释，可根据需要添加)
          if (isZhRegex.test(appName)) {
            // 可以在这里添加拼音转换逻辑
          } else {
            // 英文名称，添加首字母缩写
            const firstLetters = appName
              .split(' ')
              .map((word) => word[0])
              .join('')
            if (firstLetters && firstLetters !== appName) {
              keywords.push(firstLetters)
            }
          }

          const app: App = {
            name: appName,
            path: shortcutDetails.target,
            icon
          }

          apps.push(app)
        } catch {
          // 静默跳过无法读取的快捷方式（如系统特殊快捷方式：控制面板、计算机等）
          // 这些是正常情况，不需要记录错误
          console.error(`处理快捷方式失败 ${entry.name}`)
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败 ${dirPath}:`, error)
  }
}

export async function scanApplications(): Promise<App[]> {
  try {
    console.time('扫描应用')

    // 确保图标目录存在
    await ensureIconDir()

    const apps: App[] = []

    // Windows 开始菜单路径
    const programDataStartMenu = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs'
    const userStartMenu = path.join(
      os.homedir(),
      'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs'
    )

    // 扫描系统级开始菜单
    await scanDirectory(programDataStartMenu, apps)

    // 扫描用户级开始菜单
    await scanDirectory(userStartMenu, apps)

    console.timeEnd('扫描应用')
    console.log(`成功加载 ${apps.length} 个应用`)

    return apps
  } catch (error) {
    console.error('扫描应用失败:', error)
    return []
  }
}
