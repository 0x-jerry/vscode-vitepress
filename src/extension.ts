import type { ExtensionContext } from 'vscode'

export async function activate(context: ExtensionContext) {
  console.log('activate')
}

export function deactivate(): void {
  console.log('deactivate')
}
