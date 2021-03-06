import { injectable, singleton } from 'tsyringe'
import { executeCommand, spawnCommand } from '../util/child-process-util'
import { LogService } from './log-service'

@singleton()
@injectable()
export class GithubService {
    constructor(private log: LogService) {
    }

    async createPr(options: {baseBranch: string, childBranch: string, title: string, body: string}): Promise<void> {
        this.log.write("Creating PR with parameters", {
            ...options,
            body: '...'
        })
        // reference: https://cli.github.com/manual/gh_pr_create
        await spawnCommand('gh', [
            'pr',
            'create',
            ...['--base', options.baseBranch],
            ...['--head', options.childBranch],
            ...['--title', options.title],
            ...['--body', options.body],
            '--web',
        ])
    }

    async getPrInfo(): Promise<PrInfo | null> {
        const result = await executeCommand('gh pr view --json title,url')
        return result.errorOut ? null : JSON.parse(result.standardOut) as PrInfo
    }
}

export interface PrInfo {
    url: string,
    title: string
}
