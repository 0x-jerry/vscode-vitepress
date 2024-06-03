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

const defaultConfig: Required<Config> = {
  baseDir: 'docs',
  port: 4001
}

export function getConfig<Key extends keyof Config = keyof Config>(key: Key) {
  type KeyType = Config[Key]

  const section = 'vp'

  const c = workspace.getConfiguration(section).get<KeyType>(key)

  return c ?? defaultConfig[key]
}
