import { flatten } from 'lodash'
import { injectable, singleton } from 'tsyringe'
import { GithubPrStatus, GithubStatusService } from './github-status-service'
import { NotificationStateService, Notification } from './notification-state-service'
import { OsService } from './os-service'
import { CircleSummaryService } from './circleci-summary-service'

@singleton()
@injectable()
export class PrNotificationService {
    constructor(
        private githubStatusService: GithubStatusService,
        private circleSummaryService: CircleSummaryService,
        private notificationStateService: NotificationStateService,
        private osService: OsService,
    ) {
    }

    async notifyStatusOfPrs(prUrls: string[]): Promise<void> {
        const notifications = await Promise.all(prUrls.map(url => this.getNotifications(url)))

        return this.notificationStateService.setState(flatten(notifications))
    }

    async getNotifications(prUrl: string): Promise<Notification[]> {
        const details = await this.githubStatusService.getStatusDetails(prUrl)

        if (details.status === 'errored') {
            return details.failedChecks.map(check => {
                const { url, name } = check
                return {
                    id: url ?? name,
                    details: {
                        title: details.branchName,
                        message: 'Failed ' + cleanUpCheckName(name),
                    },
                    handler: url ? this.openUrlIfContentsClicked(url) : undefined,
                }
            })
        }

        if (details.status === 'running_checks') {
            const circleSummary = await this.circleSummaryService.getSummary(details.branchName, getCircleProjectSlug(prUrl))
            if (circleSummary.pipelineStatus === 'needs_approval') {
                return circleSummary.approvalJobs.map(job => {
                    return {
                        id: job.id,
                        details: {
                            title: details.branchName,
                            message: 'Awaiting ' + job.name,
                        },
                        handler: this.openUrlIfContentsClicked(job.url),
                    }
                })
            }
        }

        return [{
            id: prUrl + '_' + details.status,
            details: {
                title: details.branchName,
                message: mapGitHubStatusToMessage(details.status),
            },
            handler: this.openUrlIfContentsClicked(prUrl),
        }]
    }

    openUrlIfContentsClicked(url: string) {
        return async result => {
            if (result.activationType === 'contentsClicked') {
                await this.osService.openUrl(url)
            }
        }
    }
}

function mapGitHubStatusToMessage(status: GithubPrStatus): string {
    switch (status) {
        case 'merge_conflict':
            return 'Conflict with upstream'
        case 'is_behind':
            return 'Needs updating'
        case 'running_checks':
            return 'Running checks'
        case 'in_draft':
            return 'Waiting in draft'
        case 'requires_approval':
            return 'PR needs approval'
        case 'ready_to_merge':
            return 'Ready to merge'
        case 'merged':
            return 'PR merged!'
        default:
            return '[Not implemented]'
    }
}

function cleanUpCheckName(checkName: string) {
    return checkName.replace('ci/circleci: ', '')
}

function getCircleProjectSlug(githubPrUrl: string) {
    return githubPrUrl
        .replace('https://github.com', 'gh')
        .replace(/\/pull\/.+$/, '')
}
