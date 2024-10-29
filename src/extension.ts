import { commands, ThemeColor, workspace, type ExtensionContext } from 'vscode'
import { SimpleServer } from '@0x-jerry/vscode-simple-server'
import { getConfig } from './config'
import { Commands } from './commands'
import path from 'path'

export async function activate(context: ExtensionContext) {
  console.log('activate')

  const simple = new SimpleServer({
    autoStart: getConfig('autoStart'),
    env: context,
    async getStartCommand() {
      const port = getConfig('port')
      const docsDir = getConfig('docsDir')

      return `npx vitepress --host --port ${port} dev ${JSON.stringify(
        docsDir
      )}`
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
        uri.fsPath
      )

      const CONFIG = {
        docsDir: getConfig('docsDir'),
        /**
         * VitePress base url
         */
        base: getConfig('base')
      }

      if (CONFIG.docsDir) {
        if (!relativeFilePath.startsWith(CONFIG.docsDir)) {
          return
        }

        relativeFilePath = relativeFilePath.slice(CONFIG.docsDir.length)
      }

      const route = path.join(CONFIG.base, relativeFilePath)

      const pathname = route
        .replaceAll('\\', '/')
        .replace('/index.md', '')
        .replace('index.md', '')
        .replace('.md', '')

      url.pathname = pathname + (pathname === CONFIG.base ? '/' : '')

      return url.toString()
    },
    taskName: 'VP_PREVIEW',
    statusBar: {
      priority: 1000,
      started: {
        text: '$(server) VitePress',
        tooltip: 'Click to stop',
        command: Commands.stop,
        color: new ThemeColor('terminalCommandDecoration.successBackground')
      },
      stopped: {
        text: '$(server) VitePress',
        tooltip: 'Click to start',
        command: Commands.start
      },
      spinning: {
        text: '$(sync~spin) VitePress',
        tooltip: 'Starting the VitePress server',
        command: Commands.stop
      }
    }
  })

  context.subscriptions.push(
    commands.registerCommand(Commands.stop, () => simple.stop())
  )
  context.subscriptions.push(
    commands.registerCommand(Commands.start, () => simple.start())
  )
  context.subscriptions.push(
    commands.registerCommand(Commands.toggle, () => simple.toggle())
  )

  context.subscriptions.push(simple)
}

export function deactivate(): void {
  console.log('deactivate')
}
