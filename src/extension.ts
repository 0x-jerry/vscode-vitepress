import {
  commands,
  ThemeColor,
  Uri,
  window,
  workspace,
  type ExtensionContext,
  type LogOutputChannel,
} from 'vscode'
import { SimpleServer } from '@0x-jerry/vscode-simple-server'
import { getConfig } from './config'
import { Commands } from './commands'
import type { UserConfig } from 'vitepress'
import { readVitePressConfig, resolveVitePressUrl } from './vitepress'

export async function activate(context: ExtensionContext) {
  const isDebugMode = getConfig('debug')

  let logger: LogOutputChannel | undefined

  if (isDebugMode) {
    logger = window.createOutputChannel('VitePress Preview', { log: true })
    context.subscriptions.push(logger)
  }

  const vitepress = {
    loaded: false,
    config: undefined as UserConfig | undefined,
  }

  const simple = new SimpleServer({
    autoStart: getConfig('autoStart'),
    logger,
    env: context,
    checkTimeout: 5_000,
    async getStartServerCommand() {
      const port = getConfig('port')
      const docsDir = getConfig('docsDir')
      vitepress.loaded = false
      vitepress.config = undefined

      logger?.info('VitePress server starting...')

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

      const docsDir = getConfig('docsDir')

      if (!vitepress.loaded) {
        const vitePressRoot = Uri.joinPath(workspaceFolder.uri, docsDir)

        try {
          logger?.info(`load VitePress config...`)

          vitepress.config = await readVitePressConfig(vitePressRoot)
        } catch (error) {
          window.showWarningMessage(`Load VitePress config failed: ${error}`)
        }

        vitepress.loaded = true
      }

      const pathname = resolveVitePressUrl({
        vitePressRoot: workspaceFolder.uri,
        currentFile: uri,
        config: vitepress.config,
        docsDir,
      })

      logger?.info(`resolve VitePress url: ${uri.fsPath} -> ${pathname}`)

      if (pathname == null) {
        return
      }

      url.pathname = pathname

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

export function deactivate(): void {}
