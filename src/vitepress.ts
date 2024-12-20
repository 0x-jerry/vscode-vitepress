import { Uri } from 'vscode'
import { loadConfig } from 'unconfig'
import type { UserConfig, UserConfigExport } from 'vitepress'
import path from 'node:path'

export async function readVitePressConfig(vitePressRoot: Uri) {
  const { config } = await loadConfig({
    cwd: vitePressRoot.fsPath,
    sources: [
      {
        //   https://vitepress.dev/reference/site-config#config-resolution
        files: '.vitepress/config',
        extensions: ['ts', 'mts', 'js', 'mjs'],
      },
    ],
    importx: {
      cache: false,
    },
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

export interface ResolveViteUrlOptions {
  vitePressRoot: Uri
  currentFile: Uri
  config?: UserConfig
  docsDir: string
}

export function resolveVitePressUrl(opt: ResolveViteUrlOptions) {
  const { vitePressRoot, currentFile, config, docsDir } = opt

  let relativeFilePath = path
    .relative(vitePressRoot.fsPath, currentFile.fsPath)
    .replaceAll('\\', '/')

  if (docsDir) {
    if (!relativeFilePath.startsWith(docsDir)) {
      return
    }

    relativeFilePath = relativeFilePath.slice(docsDir.length)
    relativeFilePath = removeLeadingSlash(relativeFilePath)
  }

  if (config) {
    const base = config.base || ''

    if (config.srcDir) {
      if (!relativeFilePath.startsWith(config.srcDir)) {
        return
      }

      relativeFilePath = relativeFilePath.slice(config.srcDir.length)
      relativeFilePath = removeLeadingSlash(relativeFilePath)
    }

    relativeFilePath = path.join(base, relativeFilePath)
    relativeFilePath = removeLeadingSlash(relativeFilePath)
  }

  const pathname = relativeFilePath.replace('index.md', '').replace('.md', '')

  return pathname + (pathname === config?.base ? '/' : '')
}

function removeLeadingSlash(fsPath: string) {
  return fsPath.replace(/^\//, '')
}
