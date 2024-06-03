import { workspace } from 'vscode'

export interface Config {
  /**
   * @default docs
   */
  baseDir?: string

  /**
   * @default 4001
   */
  port?: number
}

const defaultConfig: Config = {
    baseDir: 'docs',
    port: 4001
}

export function getConfig<Key extends keyof Config = keyof Config>(key: Key) {
  type KeyType = Config[Key]

  return workspace.getConfiguration('vitepress').get<KeyType>(key) || defaultConfig[key]
}
