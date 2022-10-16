import { injectable } from 'tsyringe'
import { GithubService } from '../services/github-service'
import { ClipboardService } from '../services/clipboard-service'

@injectable()
export class PostPrCommand {
    constructor(
        private githubService: GithubService,
        private clipboard: ClipboardService,
    ) {
    }

    async execute() {
        const prInfo = await this.githubService.getPrInfo()
        if (prInfo) {
            const [, ...titleParts] = prInfo.title.split(' ')
            const title = titleParts.join(' ')
            const text = `[PR for review](${prInfo.url}): ${title}`
            await this.clipboard.copy(text)
            console.log('Copied text to clipboard:\n' + text)
        } else {
            console.log('Couldn\'t find a PR associated with the current branch.')
        }
    }
}
