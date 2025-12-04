export interface App {
  name: string
  path: string
  icon?: string
}

export interface AppScanner {
  scanApplications(): Promise<App[]>
}
