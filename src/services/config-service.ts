import { injectable, singleton } from 'tsyringe'
import { FileService } from './file-service'
import { Memoize } from 'typescript-memoize'

export interface AppConfig {
    jira: JiraConfig
    github: GithubConfig
    git: GitConfig
    logOutputEnabled: boolean
}

export interface JiraConfig {
    userName: string
    userId: string
    apiToken: string,
    host: string,
    statuses: {
        readyForDevelopment: string
        inDevelopment: string
        inPrReview: string
    }
}

export interface GithubConfig {
}

export interface GitConfig {
    possibleBaseBranches: string[]
}

@singleton()
@injectable()
export class ConfigService {
    private config: AppConfig | null = null

    constructor(private fileService: FileService) {
    }

    @Memoize()
    private readConfig(): AppConfig {
        if (this.config) return this.config
        // todo: account for missing file
        const json = this.fileService.readFromProjectRoot('app-config.json') as string
        return this.config = JSON.parse(json)
    }

    jiraConfig(): JiraConfig {
        return this.readConfig().jira
    }

    gitConfig(): GitConfig {
        return this.readConfig().git
    }

    logOutputEnabled(): boolean {
        return this.readConfig().logOutputEnabled
    }
}
