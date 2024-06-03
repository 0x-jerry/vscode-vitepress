import {
  ViewColumn,
  commands,
  window,
  workspace,
  type ExtensionContext,
} from 'vscode'

export async function activate(context: ExtensionContext) {
  console.log('activate')

  // todo
  const CONFIG = {
    url: 'http://localhost:5173/#/',
    routeDir: '/src/routes/',
  }

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((e) => {
      const uri = window.activeTextEditor.document.uri
      const workspaceFolder = workspace.getWorkspaceFolder(uri)

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
        viewColumn: ViewColumn.Beside,
      })
    }),
  )
}

export function deactivate(): void {
  console.log('deactivate')
}
