import { injectable } from 'tsyringe'
import { TimeService } from '../services/time-service'
import { GitService } from '../services/git-service'
import { CiStatus, CiStatusService } from '../services/ci-status-service'
import { isEqual } from 'lodash'
import { LogService } from '../services/log-service'
import { NotificationStateService, Notification } from '../services/notification-state-service'
import { OsService } from '../services/os-service'

type CiNotification = {message: string, jobId?: string, url?: string}

@injectable()
export class WatchCiCommand {
    done = false
    gitRemoteUrl: string
    branchName: string
    lastState?: CiStatus
    acknowledgedJobIds: {[jobId: string]: boolean} = {}

    constructor(
        private gitService: GitService,
        private notificationStateService: NotificationStateService,
        private timeService: TimeService,
        private ciStatusService: CiStatusService,
        private osService: OsService,
        private log: LogService,
    ) {
    }

    async execute() {
        const sleepTime = 10_000

        do {
            await Promise.all([this.doIteration(), this.timeService.sleep(sleepTime)])
        } while (!this.done)
    }

    private async setup() {
        this.gitRemoteUrl = await this.gitService.getRemoteUrl()
        this.branchName = await this.gitService.getCurrentBranch()
    }

    public async doIteration(): Promise<void> {
        if (!this.branchName) {
            await this.setup()
        }

        try {
            const currentState = await this.ciStatusService.getStatus(this.branchName, this.gitRemoteUrl)

            if (isEqual(currentState, this.lastState)) {
                return
            } else {
                this.log.write('CI status changed', currentState)
            }

            await this.doNotifications(currentState)

            if (currentState.prStatus === 'merged') {
                this.done = true
            }

            this.lastState = currentState
        } catch (ex) {
            console.log('Error encountered', ex)
        }
    }

    private async doNotifications(state: CiStatus) {
        const { prStatus, pipelineStatus } = state

        if (prStatus === 'merged') {
            return this.notify({ message: 'PR merged, have a nice day' })
        }

        switch (pipelineStatus) {
            case 'not_found':
                this.notify({ message:'Waiting for pipeline run' })
                break
            case 'succeeded':
                switch (prStatus) {
                    case 'not_created':
                        this.notify({message:'Build green, waiting for PR to be opened'})
                        break
                    case 'is_behind':
                        this.notify({message:'Branch needs updating', url: state.prUrl})
                        break
                    case 'needs_approval':
                        this.notify({message:'Build green, waiting for PR approval', url: state.prUrl})
                        break
                    case 'ready_to_merge':
                        this.notify({message:'PR ready to merge', url: state.prUrl})
                        break
                }
                break
            case 'failed':
                const failedJobs = state.failedJobs
                    .filter(job => !this.acknowledgedJobIds[job.id])
                    .map(job => ({
                        message: `${job.name} failed`,
                        jobId: job.id,
                        url: job.url,
                    }))
                this.notify(...failedJobs)
                break
            case 'needs_approval':
                const approvalJobs = state.approvalJobs
                    .filter(job => !this.acknowledgedJobIds[job.id])
                    .map(job => ({
                        message: `${job.name} pending approval`,
                        jobId: job.id,
                        url: job.url,
                    }))
                this.notify(...approvalJobs)
                break
            case 'running':
        }
    }

    private notify(...notifications: CiNotification[]) {
        this.notificationStateService.setState(
            notifications.map(({jobId, message, url}) => {
                const params: Notification = {
                    details: {
                        title: this.branchName,
                            message
                    },
                    handler: async ({activationType}) => {
                        if (jobId) {
                            this.acknowledgedJobIds[jobId] = true
                        }
                        if (url && ['contentsClicked', 'actionClicked'].includes(activationType)) {
                            await this.osService.openUrl(url)
                        }
                    },
                    id: jobId
                }
                return params
            })
        ).catch(error => console.log('Error encountered when setting notification state', error)).then()
    }
}
