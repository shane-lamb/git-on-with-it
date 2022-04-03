import { injectable, singleton } from 'tsyringe';
import { ConfigService, JiraConfig } from './config-service'
import JiraApi, { JiraApiOptions } from 'jira-client'

@singleton()
export class JiraApiFactory {
    create(options: JiraApiOptions): JiraApi {
        return new JiraApi(options)
    }
}

@singleton()
@injectable()
export class JiraService {
    private config: JiraConfig
    private api: JiraApi

    constructor(configService: ConfigService, apiFactory: JiraApiFactory) {
        this.config = configService.jiraConfig()
        this.api = apiFactory.create({
            protocol: 'https',
            host: this.config.host,
            username: this.config.userName,
            password: this.config.apiToken,
        })
    }

    async getIssuesInDevelopment(): Promise<JiraIssue[]> {
        const result = await this.api.searchJira(
            `status in ("${this.config.statuses.inDevelopment}") AND assignee in (${this.config.userId})`,
            {fields: ['summary', 'lastViewed']},
        )
        return result.issues.map(issue => ({
            summary: issue.summary,
            key: issue.key,
            lastViewed: issue.lastViewed,
        }))
    }
}

export interface JiraIssue {
    summary: string
    key: string
    lastViewed: string
}
