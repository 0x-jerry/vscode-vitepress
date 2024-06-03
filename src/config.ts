import { workspace } from 'vscode'

export interface Config {
  /**
   * @default ''
   */
  baseDir?: string

  /**
   * @default 4001
   */
  port?: number
}

const defaultConfig: Required<Config> = {
  baseDir: '',
  port: 4001
}

export function getConfig<Key extends keyof Config = keyof Config>(key: Key) {
  type KeyType = Config[Key]

  const section = 'vp'

  const c = workspace.getConfiguration(section).get<KeyType>(key)

  return c ?? defaultConfig[key]
}
