import { PrDaemonCommand } from './pr-daemon-command'
import { createMock } from '../test-util/create-mock'
import { TimeService } from '../services/time-service'
import { GithubService } from '../services/github-service'
import { LogService } from '../services/log-service'
import { PrNotificationService } from '../services/pr-notification-service'
import { when } from 'jest-when'

describe('PR daemon command', () => {
    const timeService = createMock(TimeService)
    const githubService = createMock(GithubService)
    const log = createMock(LogService)
    const prNotificationService = createMock(PrNotificationService)

    let command: PrDaemonCommand

    beforeEach(() => {
        jest.resetAllMocks()
        command = new PrDaemonCommand(timeService, githubService, log, prNotificationService)
        when(githubService.getUser).calledWith().mockResolvedValue('github-user')
    })

    it('should notify status of open PR', async () => {
        when(githubService.searchOpenPrs).calledWith('github-user').mockResolvedValue([{
            title: 'My First PR',
            url: 'https://github.com/owner-name/repo-name/pull/123',
            updatedAt: '2022-10-25T03:37:42Z'
        }])

        await command.doIteration()

        expect(prNotificationService.notifyStatusOfPrs).toBeCalledWith(['https://github.com/owner-name/repo-name/pull/123'])

        jest.clearAllMocks()
        await command.doIteration()

        expect(prNotificationService.notifyStatusOfPrs).toBeCalledWith(['https://github.com/owner-name/repo-name/pull/123'])
    })
    it('should stop notifying once PR is closed', async () => {
        when(githubService.searchOpenPrs).calledWith('github-user').mockResolvedValue([{
            title: 'My First PR',
            url: 'https://github.com/owner-name/repo-name/pull/123',
            updatedAt: '2022-10-25T03:37:42Z'
        }])

        await command.doIteration()

        when(githubService.searchOpenPrs).calledWith('github-user').mockResolvedValue([])

        jest.clearAllMocks()
        await command.doIteration()

        // should still notify of status for a single iteration after closed, so it has a chance to notify the user of a merge
        expect(prNotificationService.notifyStatusOfPrs).toBeCalledWith(['https://github.com/owner-name/repo-name/pull/123'])

        jest.clearAllMocks()
        await command.doIteration()

        // on second iteration we don't call notify
        expect(prNotificationService.notifyStatusOfPrs).toBeCalledWith([])
    })
})
