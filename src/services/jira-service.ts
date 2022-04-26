import { injectable, singleton } from 'tsyringe';
import { Memoize } from 'typescript-memoize'
import JiraApi, { JiraApiOptions } from 'jira-client'
import { ConfigService } from './config/config-service'

@singleton()
export class JiraApiFactory {
    create(options: JiraApiOptions): JiraApi {
        return new JiraApi(options)
    }
}

@singleton()
@injectable()
export class JiraService {
    constructor(private configService: ConfigService, private apiFactory: JiraApiFactory) {
    }

    @Memoize()
    getApi() {
        const config = this.configService.jiraConfig()
        return this.apiFactory.create({
            protocol: 'https',
            host: config.host,
            username: config.userName,
            password: config.apiToken,
        })
    }

    async getIssuesInDevelopment(): Promise<JiraIssue[]> {
        const config = this.configService.jiraConfig()
        const result = await this.getApi().searchJira(
            `status in ("${config.statuses.inDevelopment}") AND assignee in (${config.userId})`,
            {fields: ['summary', 'description']},
        )
        return result.issues.map(issue => ({
            summary: issue.fields.summary,
            key: issue.key,
            description: issue.fields.description,
        }))
    }

    async getAllStatuses(): Promise<JiraStatus[]> {
        const result = await this.getApi().listStatus()
        return result.map(status => ({
            name: status.name,
            id: status.id,
            categoryName: status.statusCategory.name,
            categoryKey: status.statusCategory.key,
            categoryId: status.statusCategory.id,
            projectId: status.scope?.project?.id,
        }))
    }
}

export interface JiraStatus {
    name: string
    id: string
    categoryName: string
    categoryKey: string
    categoryId: number
    projectId?: string
}

export interface JiraIssue {
    summary: string
    key: string
    description: string | null
}
