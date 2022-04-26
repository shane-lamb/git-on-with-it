import { injectable, singleton } from 'tsyringe'
import { JiraIssue, JiraService } from '../services/jira-service'
import { PromptService } from '../services/prompt-service'
import { GitService } from '../services/git-service'
import { GithubService } from '../services/github-service'
import { PrTemplateService } from '../services/pr-template-service'
import { ConfigService } from '../services/config/config-service'

@singleton()
@injectable()
export class OpenPrCommand {
    constructor(
        private jiraService: JiraService,
        private gitService: GitService,
        private promptService: PromptService,
        private githubService: GithubService,
        private prTemplateService: PrTemplateService,
        private configService: ConfigService,
    ) {
    }

    async execute(): Promise<void> {
        if (!this.gitService.isRepo()) {
            console.log('Not git repository detected. Cancelling...')
            return
        }

        const selectedBranch = await this.gitService.getCurrentBranch()
        const baseBranch = await this.gitService.getBaseBranch(selectedBranch)

        const issue = await this.getSelectedIssue(selectedBranch)

        const titleTemplate = issue ?
            `[${issue.key}] ${issue.summary}` :
            'PR title on this line'
        const bodyTemplate = this.prTemplateService.getPrBody(issue)
        const [title, body] = await this.getUserEdits(titleTemplate, bodyTemplate)

        await this.gitService.pushToRemote(selectedBranch)

        await this.githubService.createPr({
            baseBranch,
            childBranch: selectedBranch,
            title,
            body,
        })
    }

    private async getUserEdits(titleTemplate: string, bodyTemplate: string): Promise<[string, string]> {
        const config = this.configService.pullRequestConfig()
        if (!config.editInTerminal) return [titleTemplate, bodyTemplate]

        const editedText = await this.promptService.editText(`${titleTemplate}\n${bodyTemplate}`)
        const split = editedText.split('\n')
        const title = split[0]
        const [, ...bodyParts] = split
        const body = bodyParts.join('\n')
        return [title, body]
    }

    private async getSelectedIssue(currentBranch: string): Promise<JiraIssue | null> {
        const issues = await this.jiraService.getIssuesInDevelopment()
        if (!issues.length) {
            console.log('Could not find any JIRA issues "in development", continuing without JIRA issue context.')
            console.log('Have you configured your JIRA status names correctly? It must be an exact match.')
            return null
        }

        const matchingIssue = issues.find(issue => currentBranch.includes(issue.key))
        if (matchingIssue) return matchingIssue

        const selected = await this.promptService.selectOption(issues.map(issue => ({
            id: issue.key,
            description: issue.summary,
        })), 'Select a JIRA issue')

        return selected ?
            issues.find(issue => issue.key === selected) as JiraIssue :
            null
    }
}