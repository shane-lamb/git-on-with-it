import { injectable, singleton } from 'tsyringe'
import { GitService } from '../services/git-service'
import { ConfigService } from '../services/config/config-service'
import { JiraIssue, JiraService } from '../services/jira-service'
import { PromptService } from '../services/prompt-service'
import { GitConfig } from '../services/config/config-types'

@injectable()
@singleton()
export class CreateBranchCommand {
    gitConfig: GitConfig

    constructor(
        private gitService: GitService,
        private configService: ConfigService,
        private jiraService: JiraService,
        private promptService: PromptService,
    ) {
    }

    async execute() {
        const currentBranch = await this.gitService.getCurrentBranch()

        if (!this.configService.gitConfig().possibleBaseBranches.includes(currentBranch)) {
            console.log('The current branch isn\'t configured as a base branch. Cancelling...')
            return
        }

        const issues = await this.jiraService.getIssuesInDevelopment()

        const selected = await this.promptService.selectOption(issues.map(issue => ({
            id: issue.key,
            description: issue.summary,
        })), "Select a JIRA issue")

        const issue = issues.find(issue => issue.key === selected) as JiraIssue

        await this.gitService.fetchBranch(currentBranch)

        await this.gitService.createAndCheckoutBranch(formatBranchName(issue.key + '/' + issue.summary))
    }
}

function formatBranchName(name: string): string {
    // todo: https://wincent.com/wiki/Legal_Git_branch_names
    return name.replace(/ /g, '-')
}