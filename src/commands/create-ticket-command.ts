import { injectable } from 'tsyringe'
import { JiraService } from '../services/jira-service'

@injectable()
export class CreateTicketCommand {
    constructor(
        private jiraService: JiraService,
    ) {
    }

    async execute(title: string): Promise<void> {
        const issueId = await this.jiraService.createIssue('Story', title)
        console.log('Ticket created: ' + issueId)
    }
}