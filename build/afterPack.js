const fs = require('fs-extra');
const path = require('path');

module.exports = async function (context) {
  console.log('开始清理国际化文件...');

  // 定义要保留的语言包
  const keepLocales = ['en.lproj', 'zh_CN.lproj'];

  // macOS 平台
  if (context.electronPlatformName === 'darwin') {
    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(context.appOutDir, `${appName}.app`);

    // 需要清理的路径列表
    const resourcesPaths = [
      // 应用主 Resources
      path.join(appPath, 'Contents', 'Resources'),
      // Electron Framework Resources
      path.join(appPath, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Resources')
    ];

    let totalDeleted = 0;
    let totalSize = 0;

    for (const resourcesPath of resourcesPaths) {
      try {
        if (await fs.pathExists(resourcesPath)) {
          console.log(`\n清理目录: ${resourcesPath}`);
          const files = await fs.readdir(resourcesPath);
          let deletedCount = 0;

          for (const file of files) {
            if (file.endsWith('.lproj') && !keepLocales.includes(file)) {
              const filePath = path.join(resourcesPath, file);

              // 计算大小
              try {
                const size = await getFolderSize(filePath);
                totalSize += size;
              } catch (err) {
                // 忽略
              }

              await fs.remove(filePath);
              console.log(`  已删除: ${file}`);
              deletedCount++;
              totalDeleted++;
            }
          }

          if (deletedCount === 0) {
            console.log('  没有需要删除的语言包');
          }
        } else {
          console.log(`  目录不存在: ${resourcesPath}`);
        }
      } catch (err) {
        console.error(`  清理目录出错 ${resourcesPath}:`, err);
      }
    }

    console.log(`\nmacOS 总计: 删除 ${totalDeleted} 个语言包`);
    console.log(`节省空间约: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }

  // Windows 平台
  if (context.electronPlatformName === 'win32') {
    const localesPath = path.join(context.appOutDir, 'locales');
    const keepLocalesPak = ['en-US.pak', 'zh-CN.pak'];

    try {
      if (await fs.pathExists(localesPath)) {
        const files = await fs.readdir(localesPath);
        let deletedCount = 0;

        for (const file of files) {
          if (file.endsWith('.pak') && !keepLocalesPak.includes(file)) {
            const filePath = path.join(localesPath, file);
            await fs.remove(filePath);
            console.log(`已删除: ${file}`);
            deletedCount++;
          }
        }

        console.log(`Windows: 共删除 ${deletedCount} 个语言包`);
      }
    } catch (err) {
      console.error('删除 Windows 语言包时出错:', err);
    }
  }

  // Linux 平台
  if (context.electronPlatformName === 'linux') {
    const localesPath = path.join(context.appOutDir, 'locales');
    const keepLocalesPak = ['en-US.pak', 'zh-CN.pak'];

    try {
      if (await fs.pathExists(localesPath)) {
        const files = await fs.readdir(localesPath);
        let deletedCount = 0;

        for (const file of files) {
          if (file.endsWith('.pak') && !keepLocalesPak.includes(file)) {
            const filePath = path.join(localesPath, file);
            await fs.remove(filePath);
            console.log(`已删除: ${file}`);
            deletedCount++;
          }
        }

        console.log(`Linux: 共删除 ${deletedCount} 个语言包`);
      }
    } catch (err) {
      console.error('删除 Linux 语言包时出错:', err);
    }
  }

  console.log('\n国际化文件清理完成!');
};

// 计算文件夹大小
async function getFolderSize(folderPath) {
  let totalSize = 0;

  try {
    const files = await fs.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        totalSize += await getFolderSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (err) {
    // 忽略错误
  }

  return totalSize;
}