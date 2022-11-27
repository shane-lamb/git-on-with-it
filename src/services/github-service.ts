import { injectable, singleton } from 'tsyringe'
import { executeCommand, spawnCommand } from '../util/child-process-util'
import { LogService } from './log-service'
import { isEqual } from 'lodash'

@singleton()
@injectable()
export class GithubService {
    // used for debugging/logging
    lastPrInfo?: PrInfo | null

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

    // identifier can be url or branch name (or left null for current branch)
    async getPrInfo(identifier?: string): Promise<PrInfo | null> {
        const result = await executeCommand(
            'gh pr view ' +
            (identifier ? identifier + ' ' : '') +
            '--json state,statusCheckRollup,mergeable,baseRefName,headRefName,mergeStateStatus,reviewDecision,labels,isDraft,url,title'
        )
        const info = result.errorOut ? null : JSON.parse(result.standardOut) as PrInfo
        if (!isEqual(this.lastPrInfo, info)) {
            // disabled logging for now as it's producing alot of noise.
            // this.log.write('PR info changed', { info })
            this.lastPrInfo = info
        }
        return info
    }

    async getUser(): Promise<string> {
        const result = await executeCommand('gh api user')
        const info = JSON.parse(result.standardOut)
        return info.login
    }

    async searchOpenPrs(author: string): Promise<PrSearchResult[]> {
        const result = await executeCommand(`gh search prs --author ${author} --state open --json title,updatedAt,url`)
        return JSON.parse(result.standardOut)
    }
}

export interface PrSearchResult {
    title: string
    updatedAt: string
    url: string
}

export interface PrInfo {
    url: string
    title: string
    baseRefName: string // base branch name
    headRefName: string // current branch name
    isDraft: boolean
    labels: {
        id: string // not human-readable
        name: string // human-readable
        color: string // example: 'ededed'
        description: string
    }[]
    mergeStateStatus: 'BEHIND' | 'UNKNOWN' | 'BLOCKED'
    mergeable: 'MERGEABLE' | 'UNKNOWN'
    reviewDecision: 'REVIEW_REQUIRED' | 'APPROVED'
    state: 'OPEN' | 'MERGED'
    statusCheckRollup: StatusCheck[]
}

type StatusCheck = CheckRunStatusCheck | StatusContextStatusCheck

export interface CheckRunStatusCheck {
    __typename: 'CheckRun'
    name: string
    status: 'COMPLETED'
    conclusion: 'SUCCESS'
    detailsUrl: string
}

export interface StatusContextStatusCheck {
    __typename: 'StatusContext'
    state: 'PENDING' | 'SUCCESS' | 'FAILURE'
    context: string  // title/name of job
    targetUrl: string
}
