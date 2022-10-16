import { WatchCiCommand } from './watch-ci-command'
import { createMock } from '../test-util/create-mock'
import { GitService } from '../services/git-service'
import { NotificationResponse, NotifyService } from '../services/notify-service'
import { when } from 'jest-when'
import { TimeService } from '../services/time-service'
import { CiStatus, CiStatusService } from '../services/ci-status-service'
import { LogService } from '../services/log-service'

const closed: NotificationResponse = {
    activationType: 'closed',
}

describe('watch CI command', () => {
    const gitService = createMock(GitService)
    const notifyService = createMock(NotifyService)
    const timeService = createMock(TimeService)
    const ciStatusService = createMock(CiStatusService)
    const logService = createMock(LogService)

    let command: WatchCiCommand

    const branch = 'current-branch'
    const gitRemote = 'git@github.com:freetrade-io/freetrade-accounting-functions.git'

    function expectUserToBeNotified(message: string) {
        expect(notifyService.notify).toHaveBeenLastCalledWith('current-branch', message)
    }

    function givenCiStatus(params: Partial<CiStatus> = {}) {
        when(ciStatusService.getStatus).calledWith(branch, gitRemote).mockResolvedValue(
            {
                prStatus: 'not_created',
                pipelineStatus: 'not_found',
                approvalJobs: [],
                failedJobs: [],
                ...params,
            },
        )
    }

    beforeEach(() => {
        jest.resetAllMocks()
        command = new WatchCiCommand(
            gitService,
            notifyService,
            timeService,
            ciStatusService,
            logService,
        )
        notifyService.notify.mockResolvedValue(closed)

        // given the git remote url is
        gitService.getRemoteUrl.mockResolvedValue(gitRemote)

        // and we are working on a branch
        gitService.getCurrentBranch.mockResolvedValue(branch)
    })

    it('should follow a happy path scenario', async () => {
        // ITERATION 1
        // given there is initially no PR created for the current branch
        // and there is initially no CircleCI run for the current branch
        givenCiStatus({
            prStatus: 'not_created',
            pipelineStatus: 'not_found',
        })

        await command.doIteration()

        // then the user should be notified that we are waiting for a CircleCI run
        expectUserToBeNotified('Waiting for CircleCI run')

        // ITERATION 2
        // given there now exists a (successful) circleci run
        givenCiStatus({
            pipelineStatus: 'succeeded'
        })

        await command.doIteration()

        // then the user should be notified that the latest CircleCI run was a success
        // and that we are now waiting for a PR to be opened
        expectUserToBeNotified('CircleCI success! Waiting for PR to be opened')

        // ITERATION 3
        // given there now exists a PR for the branch,
        // but a review is required
        givenCiStatus({
            pipelineStatus: 'succeeded',
            prStatus: 'needs_approval',
        })

        await command.doIteration()

        // then the user should be notified that we are now waiting for approval of the PR
        expectUserToBeNotified('All green! Waiting for PR approval')

        // ITERATION 4
        // given the PR has now been approved
        givenCiStatus({
            pipelineStatus: 'succeeded',
            prStatus: 'ready_to_merge',
        })

        await command.doIteration()

        // then the user should be notified that a merge is now possible
        expectUserToBeNotified('Ready to merge!')

        // ITERATION 5
        // given the PR has now been merged
        givenCiStatus({
            pipelineStatus: 'succeeded',
            prStatus: 'merged',
        })

        await command.doIteration()

        // then the user should be notified that the PR has been merged
        expectUserToBeNotified('PR merged! Have a nice day')

        // and the program should exit, as there is nothing left to do!
        expect(command.done).toBe(true)
    })

    it('should not notify the same message twice in a row', async () => {
        givenCiStatus({
            prStatus: 'not_created',
            pipelineStatus: 'not_found',
        })

        // given the command goes through multiple iterations, with no status changes
        await command.doIteration()
        await command.doIteration()

        // then the user shouldn't be bother with the same notification again on each iteration
        expect(notifyService.notify).toBeCalledTimes(1)
    })
})
