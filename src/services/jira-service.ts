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

    async createIssue(type: 'Bug' | 'Story', title: string): Promise<string> {
        const { userId,projectKey, boardId, statuses} = this.configService.jiraConfig()
        const response = await this.getApi().addNewIssue({
            fields: {
                project: {
                    key: projectKey,
                },
                summary: title,
                assignee: {
                    id: userId,
                },
                issuetype: {
                    name: type
                },
            },
        })
        const issueId: string = response.id
        const issueKey: string = response.key
        const {transitions} = await this.getApi().listTransitions(issueId)
        const transition = transitions.find(t => t.name === statuses.inDevelopment)
        await this.getApi().transitionIssue(issueId, {transition})
        const sprints = await this.getApi().getAllSprints(boardId)
        const activeSprint = sprints.values.find(s => s.state === "active")
        await this.getApi().addIssueToSprint(issueId, activeSprint.id)
        return issueKey
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
