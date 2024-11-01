import {
  commands,
  ThemeColor,
  Uri,
  workspace,
  type ExtensionContext,
} from 'vscode'
import { SimpleServer } from '@0x-jerry/vscode-simple-server'
import { getConfig } from './config'
import { Commands } from './commands'
import path from 'path'
import type { UserConfig } from 'vitepress'
import { readVitePressConfig } from './vitepress'

export async function activate(context: ExtensionContext) {
  console.log('activate')

  const vitepress = {
    loaded: false,
    config: null as UserConfig | null,
  }

  const simple = new SimpleServer({
    autoStart: getConfig('autoStart'),
    env: context,
    async getStartServerCommand() {
      const port = getConfig('port')
      const docsDir = getConfig('docsDir')
      vitepress.loaded = false
      vitepress.config = null

      return {
        commandLine: `npx vitepress --host --port ${port} dev ${JSON.stringify(
          docsDir,
        )}`,
      }
    },
    async resolveUrl(uri) {
      const port = getConfig('port')
      const url = new URL(`http://localhost:${port}`)

      if (!uri) {
        return url.toString()
      }

      if (!uri.fsPath.endsWith('.md')) {
        return
      }

      const workspaceFolder = workspace.getWorkspaceFolder(uri)

      if (!workspaceFolder) {
        return
      }

      let relativeFilePath = path.relative(
        workspaceFolder.uri.fsPath,
        uri.fsPath,
      )

      const CONFIG = {
        docsDir: getConfig('docsDir'),
      }

      if (CONFIG.docsDir) {
        if (!relativeFilePath.startsWith(CONFIG.docsDir)) {
          return
        }

        relativeFilePath = relativeFilePath.slice(CONFIG.docsDir.length)
      }

      if (!vitepress.loaded) {
        const vitePressRoot = Uri.joinPath(workspaceFolder.uri, CONFIG.docsDir)

        vitepress.loaded = true
        try {
          vitepress.config = await readVitePressConfig(vitePressRoot)
        } catch (error) {
          console.warn('load vitepress config failed', error)
        }
      } else if (vitepress.config) {
        const base = vitepress.config.base || ''

        if (vitepress.config.srcDir) {
          if (!relativeFilePath.startsWith(vitepress.config.srcDir)) {
            return
          }

          relativeFilePath = relativeFilePath.slice(
            vitepress.config.srcDir.length,
          )
        }

        relativeFilePath = path.join(base, relativeFilePath)
      }

      const pathname = relativeFilePath
        .replaceAll('\\', '/')
        .replace('/index.md', '')
        .replace('index.md', '')
        .replace('.md', '')

      url.pathname = pathname + (pathname === vitepress.config?.base ? '/' : '')

      return url.toString()
    },
    taskName: 'VP_PREVIEW',
    statusBar: {
      priority: 1000,
      started: {
        text: '$(server) VitePress',
        tooltip: 'Click to stop',
        command: Commands.stop,
        color: new ThemeColor('terminalCommandDecoration.successBackground'),
      },
      stopped: {
        text: '$(server) VitePress',
        tooltip: 'Click to start',
        command: Commands.start,
      },
      spinning: {
        text: '$(sync~spin) VitePress',
        tooltip: 'Starting the VitePress server',
        command: Commands.stop,
      },
    },
  })

  context.subscriptions.push(
    commands.registerCommand(Commands.stop, () => simple.stop()),
  )
  context.subscriptions.push(
    commands.registerCommand(Commands.start, () => simple.start()),
  )
  context.subscriptions.push(
    commands.registerCommand(Commands.toggle, () => simple.toggle()),
  )

  context.subscriptions.push(simple)
}

export function deactivate(): void {
  console.log('deactivate')
}
