import { injectable } from 'tsyringe'
import { GitService } from '../services/git-service'
import { OsService } from '../services/os-service'
import { CircleciService } from '../services/circleci-service'

@injectable()
export class CircleCommand {
    constructor(private gitService: GitService, private osService: OsService, private circleService: CircleciService) {
    }

    async execute() {
        const repoName = await this.gitService.getRepoName()
        const projectName = await this.gitService.getGithubProjectName()
        const branchName = await this.gitService.getCurrentBranch()
        const url = `https://app.circleci.com/pipelines/github/${projectName}/${repoName}?branch=${branchName}`
        console.log('Opening ' + url)
        await this.osService.openUrl(url)
    }
}