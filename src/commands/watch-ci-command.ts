import { injectable } from 'tsyringe'
import { NotifyService } from '../services/notify-service'
import { TimeService } from '../services/time-service'
import { GitService } from '../services/git-service'
import { CiStatus, CiStatusService } from '../services/ci-status-service'
import { isEqual } from 'lodash'
import { LogService } from '../services/log-service'

@injectable()
export class WatchCiCommand {
    done = false
    gitRemoteUrl: string
    branchName: string
    lastState?: CiStatus

    constructor(
        private gitService: GitService,
        private notifyService: NotifyService,
        private timeService: TimeService,
        private ciStatusService: CiStatusService,
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
    }

    private async doNotifications(state: CiStatus) {
        const { prStatus, pipelineStatus } = state

        if (prStatus === 'merged') return this.notify('PR merged! Have a nice day')

        if (pipelineStatus === 'not_found') return this.notify('Waiting for CircleCI run')

        if (pipelineStatus === 'succeeded') {
            if (prStatus === 'not_created') return this.notify('CircleCI success! Waiting for PR to be opened')
            if (prStatus === 'needs_approval') return this.notify('All green! Waiting for PR approval')
            if (prStatus === 'ready_to_merge') return this.notify('Ready to merge!')
        }
    }

    private async notify(message: string) {
        await this.notifyService.notify(this.branchName, message)
    }
}
