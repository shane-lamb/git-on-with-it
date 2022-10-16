import { injectable, singleton } from 'tsyringe'
import { Memoize } from 'typescript-memoize'
import { FileService } from '../file-service'
import {
    AppConfig,
    appConfigSchema,
    CircleciConfig,
    GitConfig,
    JiraConfig,
    NotificationConfig,
    PullRequestConfig,
} from './config-types'
import { AppError } from '../../util/error'

@singleton()
@injectable()
export class ConfigService {
    private config: AppConfig | null = null

    constructor(private fileService: FileService) {
    }

    @Memoize()
    private readConfig(): AppConfig {
        if (this.config) return this.config

        const json = this.fileService.readFromProjectRoot('app-config.json')
        if (json === null) {
            throw new AppError('Could not find app-config.json file! You can copy app-config.template.json as a starting point.')
        }

        let parsed
        try {
            parsed = JSON.parse(json)
        } catch (error) {
            throw new AppError('app-config.json file does not contain valid JSON and could not be parsed!')
        }

        const validationResult = appConfigSchema.validate(parsed)
        if (validationResult.error) {
            throw new AppError('app-config.json validation failed.' + validationResult.error.details.map(detail => '\n' + detail.message))
        }

        return this.config = parsed
    }

    jiraConfig(): JiraConfig {
        return this.readConfig().jira
    }

    circleciConfig(): CircleciConfig {
        return this.readConfig().circleci
    }

    notificationConfig(): NotificationConfig {
        return this.readConfig().notification
    }

    gitConfig(): GitConfig {
        return this.readConfig().git
    }

    pullRequestConfig(): PullRequestConfig {
        return this.readConfig().pullRequest
    }

    logOutputEnabled(): boolean {
        return this.readConfig().logOutputEnabled
    }
}
