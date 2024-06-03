import {
  Disposable,
  ShellExecution,
  Task,
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

const VP_TASK_NAME = 'VP_PREVIEW'

export class PreviewPanel implements Disposable {
  _disposables: Disposable[] = []

  editorChangeListener?: Disposable

  taskExecution?: TaskExecution

  currentUrl?: string

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

  _openUrl(url: string) {
    if (this.currentUrl === url) return

    this.currentUrl = url
    // https://github.com/microsoft/vscode/blob/403294d92b4fbcdad61bb74635a8e5e145151aaa/extensions/simple-browser/src/extension.ts#L58
    commands.executeCommand('simpleBrowser.api.open', url, {
      viewColumn: ViewColumn.Beside
    })
  }

  async _startVPTask() {
    const exists = tasks.taskExecutions.find(
      (n) => n.task.name === VP_TASK_NAME
    )

    if (exists) {
      this.taskExecution = exists
      return exists
    }

    const port = getConfig('port')

    const task = new Task(
      { type: 'VP' },
      TaskScope.Workspace,
      VP_TASK_NAME,
      'vscode extension',
      new ShellExecution(`npx vitepress --host --port ${port}`)
    )

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

  _navigateCurrentPage() {
    if (!window.activeTextEditor) return

    const uri = window.activeTextEditor.document.uri
    const workspaceFolder = workspace.getWorkspaceFolder(uri)

    if (!workspaceFolder) return

    const CONFIG = {
      host: `http://localhost:${getConfig('port')}`,
      routeDir: getConfig('baseDir')
    }

    const relativePath = uri.fsPath.slice(workspaceFolder.uri.fsPath.length)

    if (
      !relativePath.startsWith(CONFIG.routeDir) ||
      !relativePath.endsWith('.md')
    ) {
      return
    }

    const route = relativePath.replace(CONFIG.routeDir, '')

    const pathname = route
      .replaceAll('\\', '/')
      .replace('/index.md', '')
      .replace('index.md', '')
      .replace('.md', '')

    const url = CONFIG.host + pathname

    this._openUrl(url)
  }

  async _detectVPServer() {
    const url = 'http://localhost:' + getConfig('port')

    let now = Date.now()

    let endTime = now + 15 * 1000
    while (now < endTime) {
      try {
        const resp = await fetch(url)

        console.log('x', resp)
        return true
      } catch (error) {
        // failed
        console.error(error)
      }

      await sleep(500)
      now = Date.now()
    }

    return false
  }

  async start() {
    if (this.isStarted) return

    this.statusBar.spinning()

    this.editorChangeListener = window.onDidChangeActiveTextEditor((e) => {
      this._navigateCurrentPage()
    })

    this.taskExecution = await this._startVPTask()

    await this._detectVPServer()

    this._navigateCurrentPage()
    this.statusBar.started()
  }

  stop() {
    this.editorChangeListener?.dispose()
    this.taskExecution?.terminate()

    this.taskExecution = undefined
    this.editorChangeListener = undefined

    this.statusBar.stopped()
  }

  dispose() {
    this.stop()

    this.statusBar.dispose()
    this._disposables.forEach((i) => i.dispose())
  }
}
