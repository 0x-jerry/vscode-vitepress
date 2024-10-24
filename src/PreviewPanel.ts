import {
  Disposable,
  ShellExecution,
  Task,
  TaskRevealKind,
  TaskScope,
  ViewColumn,
  commands,
  tasks,
  window,
  workspace,
  type ExtensionContext,
  type TaskExecution
} from 'vscode'
import { Commands } from './commands'
import { getConfig } from './config'
import { StatusBar } from './StatusBar'
import { sleep } from '@0x-jerry/utils'
import path from 'path'
import { URL } from 'url'

const VP_TASK_NAME = 'VP_PREVIEW'

export class PreviewPanel implements Disposable {
  _disposables: Disposable[] = []

  editorChangeListener?: Disposable

  taskExecution?: TaskExecution

  currentUrl?: string

  vpServerStarted?: boolean

  statusBar = new StatusBar()

  get isStarted() {
    return !!this.editorChangeListener
  }

  constructor(readonly env: ExtensionContext) {
    this._initCommands()

    this._addDisposable(
      tasks.onDidEndTask((e) => {
        if (e.execution.task.name === VP_TASK_NAME) {
          this.stop()
        }
      })
    )

    if (getConfig('autoStart')) {
      this.start()
    }
  }

  _initCommands() {
    this._addDisposable(
      commands.registerCommand(Commands.start, () => this.start())
    )

    this._addDisposable(
      commands.registerCommand(Commands.stop, () => this.stop())
    )

    this._addDisposable(
      commands.registerCommand(Commands.toggle, () => this.toggle())
    )
  }

  _addDisposable(t: Disposable) {
    this._disposables.push(t)
  }

  async _openUrl(url: string) {
    const hasSimpleBrowserOpened = !!window.tabGroups.all.find((group) => {
      return group.tabs.find((t) => t.label === 'Simple Browser')
    })

    if (this.currentUrl === url && hasSimpleBrowserOpened) return

    if (this.vpServerStarted) {
      this.currentUrl = url
    }

    // https://github.com/microsoft/vscode/blob/403294d92b4fbcdad61bb74635a8e5e145151aaa/extensions/simple-browser/src/extension.ts#L58
    await commands.executeCommand('simpleBrowser.api.open', url, {
      viewColumn: ViewColumn.Beside,
      preserveFocus: true
    })
  }

  async _startVPTask() {
    const port = getConfig('port')
    const docsDir = getConfig('docsDir')

    const task = new Task(
      { type: 'VP' },
      TaskScope.Workspace,
      VP_TASK_NAME,
      'vscode extension',
      new ShellExecution(
        `npx vitepress --host --port ${port} dev ${JSON.stringify(docsDir)}`
      )
    )

    task.isBackground = true
    task.presentationOptions.reveal = TaskRevealKind.Silent

    const execution = await tasks.executeTask(task)
    this.taskExecution = execution

    return execution
  }

  toggle() {
    if (this.isStarted) {
      this.stop()
    } else {
      this.start()
    }
  }

  async _navigateCurrentPage() {
    if (!window.activeTextEditor) return

    const uri = window.activeTextEditor.document.uri
    const workspaceFolder = workspace.getWorkspaceFolder(uri)

    if (!uri.fsPath.endsWith('.md')) {
      return
    }

    if (!workspaceFolder) return

    let relativeFilePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath)

    const CONFIG = {
      host: `http://localhost:${getConfig('port')}`,
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

    const url = new URL(CONFIG.host)
    url.pathname = pathname + (pathname === CONFIG.base ? '/' : '')

    await this._openUrl(url.toString())
  }

  async _detectVPServer() {
    const url = 'http://localhost:' + getConfig('port')

    let now = Date.now()

    const maxTime = now + 15 * 1000
    while (now < maxTime) {
      try {
        await fetch(url)

        // VitePress start success
        return true
      } catch (error) {
        // failed
        // ignore
      }

      await sleep(500)
      now = Date.now()
    }

    return false
  }

  async start() {
    if (this.isStarted) return

    this.vpServerStarted = false
    this.statusBar.spinning()

    this.editorChangeListener = window.onDidChangeActiveTextEditor((e) => {
      this._navigateCurrentPage()
    })

    this.taskExecution = await this._startVPTask()

    this.vpServerStarted = await this._detectVPServer()

    this._navigateCurrentPage()
    this.statusBar.started()
  }

  stop() {
    this.editorChangeListener?.dispose()
    this.editorChangeListener = undefined

    this.taskExecution?.terminate()
    this.taskExecution = undefined

    this.currentUrl = undefined
    this.vpServerStarted = undefined
    this.statusBar.stopped()
  }

  dispose() {
    this.stop()

    this.statusBar.dispose()
    this._disposables.forEach((i) => i.dispose())
  }
}
