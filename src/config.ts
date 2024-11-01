import { workspace } from 'vscode'

export interface Config {
  /**
   * @default ''
   */
  docsDir?: string

  /**
   * @default 4001
   */
  port?: number

  /**
   * @default false
   */
  autoStart?: boolean
}

const defaultConfig: Required<Config> = {
  docsDir: '',
  port: 4001,
  autoStart: false,
}

export function getConfig<Key extends keyof Config = keyof Config>(key: Key) {
  type KeyType = Config[Key]

  const section = 'vp'

  const c = workspace.getConfiguration(section).get<KeyType>(key)

  return c ?? defaultConfig[key]
}
