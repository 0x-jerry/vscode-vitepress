import type { Uri } from 'vscode'
import { loadConfig } from 'unconfig'
import type { UserConfigExport } from 'vitepress'

export async function readVitePressConfig(vitePressRoot: Uri) {
  const { config, sources } = await loadConfig({
    cwd: vitePressRoot.fsPath,
    sources: [
      {
        //   https://vitepress.dev/reference/site-config#config-resolution
        files: '.vitepress/config',
        extensions: ['ts', 'mts', 'js', 'mjs'],
      },
    ],
    merge: false,
  })

  const _config = config as UserConfigExport<any>

  if (typeof _config === 'function') {
    return _config({
      command: 'serve',
      mode: 'development',
    })
  }

  return _config
}
