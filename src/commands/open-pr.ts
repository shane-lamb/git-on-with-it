import path from 'path'
import { injectable, singleton } from 'tsyringe'
import { JiraIssue, JiraService } from '../services/jira-service'
import { FileService } from '../services/file-service'
import { PromptService } from '../services/prompt-service'

@singleton()
@injectable()
export class OpenPr {
    constructor(
        private jiraService: JiraService,
        private fileService: FileService,
        private promptService: PromptService,
    ) {
    }

    async execute(): Promise<string | null> {
        const gitDir = this.fileService.getGitRepoRootDirectory()
        if (!gitDir) return null

        const title = await this.getTitle()

        const body = await this.getBody(gitDir)

        return `${title}\n${body}`
    }

    private async getTitle() {
        const issues = await this.jiraService.getIssuesInDevelopment()
        if (issues.length) {
            const selected = await this.promptService.selectOption(issues.map(issue => ({
                id: issue.key,
                description: issue.summary,
            })), "Select a JIRA issue")
            if (selected) {
                const issue = issues.find(issue => issue.key === selected) as JiraIssue
                return `[${issue.key}] ${issue.summary}`
            }
        }
        return 'PR title on this line'
    }

    private async getBody(gitDirectory: string) {
        const templateFile = this.fileService.readFile(path.join(gitDirectory, '.github', 'PULL_REQUEST_TEMPLATE.md'))
        return templateFile || 'PR body goes here'
    }
}