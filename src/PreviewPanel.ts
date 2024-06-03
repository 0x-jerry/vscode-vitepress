import {
  Disposable,
  ViewColumn,
  commands,
  window,
  workspace,
  type ExtensionContext
} from 'vscode'
import { Commands } from './commands'

export class PreviewPanel implements Disposable {
  _disposables: Disposable[] = []

  editorChangeListener?: Disposable

  constructor(readonly env: ExtensionContext) {
    this._initCommands()
  }

  _initCommands() {
    this._addDisposable(
      commands.registerCommand(Commands.start, () => this.start())
    )

    this._addDisposable(
      commands.registerCommand(Commands.stop, () => this.stop())
    )
  }

  _addDisposable(t: Disposable) {
    this._disposables.push(t)
  }

  start() {
    if (this.editorChangeListener) return

    // todo
    const CONFIG = {
      url: 'http://localhost:5173/#/',
      routeDir: '/src/routes/'
    }

    this.editorChangeListener = window.onDidChangeActiveTextEditor((e) => {
      if (!window.activeTextEditor) return

      const uri = window.activeTextEditor.document.uri
      const workspaceFolder = workspace.getWorkspaceFolder(uri)

      if (!workspaceFolder) return

      const relativePath = uri.fsPath.slice(workspaceFolder.uri.fsPath.length)

      if (!relativePath.startsWith(CONFIG.routeDir)) {
        return
      }

      const route = relativePath.replace(CONFIG.routeDir, '')

      // todo, convert strategy
      const pathname = route.replace('/index.vue', '').replace('.vue', '')

      const url = CONFIG.url + pathname
      console.log(url, pathname)

      // https://github.com/microsoft/vscode/blob/403294d92b4fbcdad61bb74635a8e5e145151aaa/extensions/simple-browser/src/extension.ts#L58
      commands.executeCommand('simpleBrowser.api.open', url, {
        viewColumn: ViewColumn.Beside
      })
    })
  }

  stop() {
    this.editorChangeListener?.dispose()
    this.editorChangeListener = undefined
  }

  dispose() {
    this.editorChangeListener?.dispose()
    this._disposables.forEach((i) => i.dispose())
  }
}
