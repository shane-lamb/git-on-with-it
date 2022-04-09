import { mapKeys } from 'lodash'
import { injectable, singleton } from 'tsyringe'
import { JiraIssue, JiraService } from '../services/jira-service'
import { FileService } from '../services/file-service'
import { PromptService } from '../services/prompt-service'
import { GitService } from '../services/git-service'
import { GithubService } from '../services/github-service'
import { TransformService } from '../services/transform-service'
import { ConfigService } from '../services/config-service'

@singleton()
@injectable()
export class OpenPrCommand {
    constructor(
        private jiraService: JiraService,
        private gitService: GitService,
        private fileService: FileService,
        private promptService: PromptService,
        private githubService: GithubService,
        private transformService: TransformService,
        private configService: ConfigService,
    ) {
    }

    async execute(): Promise<void> {
        const gitDir = this.fileService.getGitRepoRootDirectory()
        if (!gitDir) return

        const selectedBranch = await this.gitService.getCurrentBranch()
        const baseBranch = await this.gitService.getBaseBranch(selectedBranch)

        const issue = await this.getSelectedIssue(selectedBranch)

        const titleTemplate = issue ?
            `[${issue.key}] ${issue.summary}` :
            'PR title on this line'
        const bodyTemplate = await this.getBodyTemplate(gitDir, issue)
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
        const editedText = await this.promptService.editText(`${titleTemplate}\n${bodyTemplate}`)
        const split = editedText.split('\n')
        const title = split[0]
        const [, ...bodyParts] = split
        const body = bodyParts.join('\n')
        return [title, body]
    }

    private async getSelectedIssue(currentBranch: string): Promise<JiraIssue | null> {
        const issues = await this.jiraService.getIssuesInDevelopment()
        if (!issues.length) return null

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

    private async getBodyTemplate(gitDirectory: string, issue: JiraIssue | null) {
        const config = this.configService.prTemplateConfig()

        const templateFile = this.fileService.readFile(gitDirectory, '.github', 'PULL_REQUEST_TEMPLATE.md')

        const base = templateFile || 'PR body goes here'
        const withReplaced = this.transformService.doReplacements(base, config.replacements)
        return this.transformService.substituteVariables(withReplaced, {
            ...mapKeys(issue, (value, key) => 'issue.' + key)
        })
    }
}