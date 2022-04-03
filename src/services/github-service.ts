import { injectable, singleton } from 'tsyringe'
import { spawnCommand } from '../util/child-process-util'

@injectable()
@singleton()
export class GithubService {
    async createPr(options: {baseBranch: string, childBranch: string, title: string, body: string}): Promise<void> {
        await spawnCommand('gh', [
            ...['--base', options.baseBranch],
            ...['--head', options.childBranch],
            ...['--title', options.title],
            ...['--body', options.body],
            '--web',
        ])
    }
}