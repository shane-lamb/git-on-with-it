import { injectable } from 'tsyringe'
import { JiraService } from '../services/jira-service'
import { PromptService } from '../services/prompt-service'
import { ConfigService } from '../services/config/config-service'

@injectable()
export class CreateTicketCommand {
    constructor(
        private jiraService: JiraService,
        private promptService: PromptService,
        private configService: ConfigService,
    ) {
    }

    async execute(): Promise<void> {
        const { host } = this.configService.jiraConfig()
        const type = await this.promptService.selectOption([
            {
                id: 'Story',
                description: 'Story'
            },
            {
                id: 'Bug',
                description: 'Bug'
            },
        ], 'Type')
        const title = await this.promptService.enterText('Title')
        if (!title) {
            console.log('Cancelled.')
            return
        }
        const issueKey = await this.jiraService.createIssue(type as any, title)
        console.log('JIRA issue created: ' + issueKey)
        console.log(`Link: https://${host}/browse/${issueKey}`)
    }
}