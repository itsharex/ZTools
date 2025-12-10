import { shell } from 'electron'

export async function launchApp(appPath: string): Promise<void> {
  // 检查是否是系统设置 URI
  if (appPath.startsWith('ms-settings:')) {
    try {
      await shell.openExternal(appPath)
      console.log(`成功打开系统设置: ${appPath}`)
      return
    } catch (error) {
      console.error('打开系统设置失败:', error)
      throw error
    }
  }
  
  // 先尝试使用 shell.openPath()（适用于大多数情况，包括 .lnk 快捷方式）
  return new Promise((resolve, reject) => {
    shell
      .openPath(appPath)
      .then((error) => {
        if (error) {
          console.error('shell.openPath 失败:', error)
          
          // .lnk 文件如果失败，直接报错（不应该失败）
          if (appPath.toLowerCase().endsWith('.lnk')) {
            reject(new Error(`快捷方式启动失败: ${error}`))
            return
          }
          
          // 对于 .exe 文件，尝试使用 shell.openExternal()
          if (appPath.toLowerCase().endsWith('.exe')) {
            console.log('尝试使用 openExternal 启动...')
            shell.openExternal(appPath).then(() => {
              console.log(`成功启动应用（openExternal）: ${appPath}`)
              resolve()
            }).catch((extError) => {
              console.error('openExternal 启动也失败:', extError)
              reject(new Error(`启动失败: ${error}`))
            })
          } else {
            reject(new Error(`启动失败: ${error}`))
          }
        } else {
          console.log(`成功启动应用: ${appPath}`)
          resolve()
        }
      })
      .catch((error) => {
        console.error('启动应用失败:', error)
        reject(error)
      })
  })
}
