import { injectable, singleton } from 'tsyringe'
import { JiraIssue } from './jira-service'
import { FileService } from './file-service'
import { ConfigService } from './config/config-service'
import { TransformService } from './transform-service'
import { mapKeys } from 'lodash'

@injectable()
@singleton()
export class PrTemplateService {
    constructor(
        private configService: ConfigService,
        private fileService: FileService,
        private transformService: TransformService,
    ) {
    }

    getPrBody(issue: JiraIssue | null): string {
        const config = this.configService.pullRequestConfig().template

        const gitDirectory = this.fileService.getGitRepoRootDirectory()
        const templateFile = gitDirectory && this.fileService.readFile(gitDirectory, '.github', 'PULL_REQUEST_TEMPLATE.md')

        const base = templateFile || 'PR body goes here'
        const withReplaced = this.transformService.doReplacements(base, config.replacements)

        return this.transformService.substituteVariables(withReplaced, {
            ...mapKeys(this.formatDescription(issue) || {}, (value, key) => 'issue.' + key),
        })
    }

    formatDescription(issue: JiraIssue | null): JiraIssue | null {
        return issue ? {
            ...issue,
            description: issue.description ? this.transformService.jiraToGithubFormat(issue.description) : issue.description,
        } : null
    }
}