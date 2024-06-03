import {
  ViewColumn,
  commands,
  window,
  workspace,
  type ExtensionContext
} from 'vscode'
import { PreviewPanel } from './PreviewPanel'

export async function activate(context: ExtensionContext) {
  console.log('activate')

  context.subscriptions.push(new PreviewPanel(context))
}

export function deactivate(): void {
  console.log('deactivate')
}
