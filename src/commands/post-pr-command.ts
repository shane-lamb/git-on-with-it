import { injectable } from 'tsyringe'
import { GithubService } from '../services/github-service'
import { OsService } from '../services/os-service'
import { GitService } from '../services/git-service'

@injectable()
export class PostPrCommand {
    constructor(
        private githubService: GithubService,
        private osService: OsService,
        private gitSerice: GitService,
    ) {
    }

    async execute() {
        const prInfo = await this.githubService.getPrInfo()
        if (prInfo) {
            const [, ...titleParts] = prInfo.title.split(' ')
            const title = titleParts.join(' ')
            const repoName = '`' + await this.gitSerice.getRepoName() + '`'
            const text = `${repoName} [PR for review](${prInfo.url}): ${title}`
            await this.osService.copyToClipboard(text)
            console.log('Copied text to clipboard:\n' + text)
        } else {
            console.log('Couldn\'t find a PR associated with the current branch.')
        }
    }
}
