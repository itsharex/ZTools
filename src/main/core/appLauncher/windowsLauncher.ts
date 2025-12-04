import { spawn } from 'child_process'

export function launchApp(appPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Windows 使用 start 命令启动应用
      // 使用 spawn 并设置 detached: true 让子进程独立运行
      const child = spawn('cmd.exe', ['/c', 'start', '', appPath], {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true
      })

      child.on('error', (error) => {
        console.error('启动应用失败:', error)
        reject(error)
      })

      // 不等待子进程结束，直接返回
      child.unref()

      console.log(`成功启动应用: ${appPath}`)
      resolve()
    } catch (error) {
      console.error('启动应用失败:', error)
      reject(error)
    }
  })
}
