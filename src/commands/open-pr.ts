import { injectable, singleton } from 'tsyringe'
import { JiraIssue, JiraService } from '../services/jira-service'
import { FileService } from '../services/file-service'
import { PromptService } from '../services/prompt-service'
import { GitService } from '../services/git-service'
import { GithubService } from '../services/github-service'

@singleton()
@injectable()
export class OpenPr {
    constructor(
        private jiraService: JiraService,
        private gitService: GitService,
        private fileService: FileService,
        private promptService: PromptService,
        private githubService: GithubService,
    ) {
    }

    async execute(): Promise<void> {
        const gitDir = this.fileService.getGitRepoRootDirectory()
        if (!gitDir) return

        const title = await this.getTitle()
        const body = await this.getBody(gitDir)

        const editedText = await this.promptService.editText(`${title}\n${body}`)
        const split = editedText.split('\n')
        const first = split[0]
        const [, ...rest] = split

        const selectedBranch = await this.gitService.getCurrentBranch()
        const baseBranch = await this.gitService.getBaseBranch(selectedBranch)

        await this.gitService.pushToRemote(selectedBranch)

        await this.githubService.createPr({
            baseBranch,
            childBranch: selectedBranch,
            title: first,
            body: rest.join('\n')
        })
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
        const templateFile = this.fileService.readFile(gitDirectory, '.github', 'PULL_REQUEST_TEMPLATE.md')
        return templateFile || 'PR body goes here'
    }
}