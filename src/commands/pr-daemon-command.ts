import { injectable, singleton } from 'tsyringe'
import { LogService } from '../services/log-service'
import { TimeService } from '../services/time-service'
import { GithubService } from '../services/github-service'
import { PrNotificationService } from '../services/pr-notification-service'

@injectable()
@singleton()
export class PrDaemonCommand {
    private lastPrUrls = {}

    constructor(
        private timeService: TimeService,
        private githubService: GithubService,
        private log: LogService,
        private prNotificationService: PrNotificationService,
    ) {
    }

    githubUser: string

    async execute() {
        const sleepTime = 10_000

        // noinspection InfiniteLoopJS
        do {
            try {
                await Promise.all([this.doIteration(), this.timeService.sleep(sleepTime)])
            } catch (ex) {
                console.log('PR daemon: error encountered', ex)
            }
        } while (true)
    }

    private async setup() {
        this.githubUser = await this.githubService.getUser()
    }

    public async doIteration(): Promise<void> {
        if (!this.githubUser) {
            await this.setup()
        }

        const openPrs = await this.githubService.searchOpenPrs(this.githubUser)
        for (const pr of openPrs) {
            this.lastPrUrls[pr.url] = true
        }

        await this.prNotificationService.notifyStatusOfPrs(Object.keys(this.lastPrUrls))

        this.lastPrUrls = {}
        for (const pr of openPrs) {
            this.lastPrUrls[pr.url] = true
        }
    }
}
