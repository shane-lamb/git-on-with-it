import { GithubService, StatusContextStatusCheck } from './github-service'
import { injectable, singleton } from 'tsyringe'

// status priorities: errored -> merge_conflict -> is_behind -> running_checks -> in_draft -> requires_approval -> ready_to_merge -> merged
export type GithubPrStatus =
    'errored'
    | 'merge_conflict'
    | 'is_behind'
    | 'running_checks'
    | 'in_draft'
    | 'requires_approval'
    | 'ready_to_merge'
    | 'merged'

export interface GithubPrCheck {
    isExternal: boolean
    name: string
    url?: string
}

export interface GithubPrStatusDetails {
    status: GithubPrStatus
    branchName: string
    failedChecks: GithubPrCheck[]
    runningChecks: GithubPrCheck[]
}

@injectable()
@singleton()
export class GithubStatusService {
    constructor(private githubService: GithubService) {
    }

    async getStatusDetails(prUrl: string): Promise<GithubPrStatusDetails> {
        const info = await this.githubService.getPrInfo(prUrl)
        if (!info) {
            throw Error('PR not found')
        }

        const externalChecks = info.statusCheckRollup
            .filter(check => check.__typename === 'StatusContext')
            .map((check: StatusContextStatusCheck) => check)

        const failedChecks = externalChecks.filter(check => check.state === 'FAILURE').map(mapExternalCheck)
        const runningChecks = externalChecks.filter(check => check.state === 'PENDING').map(mapExternalCheck)

        return {
            status: failedChecks.length ? 'errored' :
                info.mergeStateStatus === 'BEHIND' ? 'is_behind' :
                    runningChecks.length ? 'running_checks' :
                        info.isDraft ? 'in_draft' :
                            info.reviewDecision === 'REVIEW_REQUIRED' ? 'requires_approval' :
                                info.state === 'MERGED' ? 'merged' : 'ready_to_merge',
            failedChecks,
            runningChecks,
            branchName: info.headRefName,
        }
    }
}

function mapExternalCheck(check: StatusContextStatusCheck): GithubPrCheck {
    return {
        isExternal: true,
        url: check.targetUrl,
        name: check.context,
    }
}
