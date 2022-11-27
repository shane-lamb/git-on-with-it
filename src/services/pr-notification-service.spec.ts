import { when } from 'jest-when'

import { createMock } from '../test-util/create-mock'
import { PrNotificationService } from './pr-notification-service'
import { GithubPrStatus, GithubStatusService } from './github-status-service'
import { Notification, NotificationStateService } from './notification-state-service'
import { OsService } from './os-service'
import { CircleSummaryService } from './circleci-summary-service'

describe('PR notification service', () => {
    const githubStatusService = createMock(GithubStatusService)
    const circleSummaryService = createMock(CircleSummaryService)
    const notificationStateService = createMock(NotificationStateService)
    const osService = createMock(OsService)
    const service = new PrNotificationService(githubStatusService, circleSummaryService, notificationStateService, osService)

    beforeEach(() => {
        jest.resetAllMocks()
    })

    const prUrl = 'https://github.com/my-org/my-repo/pull/99'
    const projectSlug = 'gh/my-org/my-repo'
    const branchName = 'my-branch'

    const statusNotificationCases: [GithubPrStatus, string][] = [
        ['in_draft', 'Waiting in draft'],
        ['is_behind', 'Needs updating'],
        ['ready_to_merge', 'Ready to merge'],
        ['merge_conflict', 'Conflict with upstream'],
        ['requires_approval', 'PR needs approval'],
        ['merged', 'PR merged!'],
    ]
    it.each(statusNotificationCases)('should display notification when status = %s', async (status: GithubPrStatus, expectedMessage: string) => {
        when(githubStatusService.getStatusDetails).calledWith(prUrl).mockResolvedValue({
            status,
            runningChecks: [],
            failedChecks: [],
            branchName,
        })

        await service.notifyStatusOfPrs([prUrl])

        // then user should be notified
        const expectedNotifications: Notification[] = [{
            id: `${prUrl}_${status}`,
            details: {
                title: branchName,
                message: expectedMessage,
            },
            handler: expect.anything(),
        }]
        expect(notificationStateService.setState).toBeCalledWith(expectedNotifications)

        // and if user clicks on the notification...
        const handler = notificationStateService.setState.mock.calls[0][0][0].handler!
        await handler({
            activationType: 'contentsClicked',
        })

        // ...then the PR should be opened in the browser
        expect(osService.openUrl).toBeCalledWith(prUrl)
    })

    it('should display CI error notifications', async () => {
        when(githubStatusService.getStatusDetails).calledWith(prUrl).mockResolvedValue({
            status: 'errored',
            runningChecks: [],
            failedChecks: [{
                name: 'ci/circleci: build-and-test',
                url: 'https://circleci.com/gh/my-org/my-repo/112233',
                isExternal: true,
            }],
            branchName,
        })

        await service.notifyStatusOfPrs([prUrl])

        // then user should be notified
        const expectedNotifications: Notification[] = [{
            id: 'https://circleci.com/gh/my-org/my-repo/112233',
            details: {
                title: branchName,
                message: 'Failed build-and-test',
            },
            handler: expect.anything(),
        }]
        expect(notificationStateService.setState).toBeCalledWith(expectedNotifications)

        // and if user clicks on the notification...
        const handler = notificationStateService.setState.mock.calls[0][0][0].handler!
        await handler({
            activationType: 'contentsClicked',
        })

        // ...then the error details should be opened in the browser
        expect(osService.openUrl).toBeCalledWith('https://circleci.com/gh/my-org/my-repo/112233')
    })

    describe('given checks are running (PR has running_checks status)', () => {
        beforeEach(() => {
            when(githubStatusService.getStatusDetails).calledWith(prUrl).mockResolvedValue({
                status: 'running_checks',
                runningChecks: [],
                failedChecks: [],
                branchName,
            })
        })

        describe('given there exists approval jobs on CircleCI for the current branch', () => {
            const approvalJobs = [{
                name: 'hold-start-integration-test',
                url: 'https://app.circleci.com/pipelines/github/my-org/my-repo/1234/workflows/e1a2b3c4',
                id: 'g5h6j7',
            }]

            it('should notify of approval jobs if they are currently blocking the pipeline', async () => {
                when(circleSummaryService.getSummary).calledWith(branchName, projectSlug).mockResolvedValue({
                    pipelineStatus: 'needs_approval',
                    approvalJobs,
                    failedJobs: [],
                })

                await service.notifyStatusOfPrs([prUrl])

                // then user should be notified
                const expectedNotifications: Notification[] = [{
                    id: 'g5h6j7',
                    details: {
                        title: branchName,
                        message: 'Awaiting hold-start-integration-test',
                    },
                    handler: expect.anything(),
                }]
                expect(notificationStateService.setState).toBeCalledWith(expectedNotifications)

                // and if user clicks on the notification...
                const handler = notificationStateService.setState.mock.calls[0][0][0].handler!
                await handler({
                    activationType: 'contentsClicked',
                })

                // ...then the blocked workflow should be opened in the browser
                expect(osService.openUrl).toBeCalledWith('https://app.circleci.com/pipelines/github/my-org/my-repo/1234/workflows/e1a2b3c4')
            })
            it('should give a general "Running checks" notification if pipeline is not yet blocked by approval', async () => {
                when(circleSummaryService.getSummary).calledWith(branchName, projectSlug).mockResolvedValue({
                    pipelineStatus: 'running',
                    approvalJobs,
                    failedJobs: [],
                })

                await service.notifyStatusOfPrs([prUrl])

                // then user should be notified
                const expectedNotifications: Notification[] = [{
                    id: `${prUrl}_running_checks`,
                    details: {
                        title: branchName,
                        message: 'Running checks',
                    },
                    handler: expect.anything(),
                }]
                expect(notificationStateService.setState).toBeCalledWith(expectedNotifications)
            })
        })
    })
})
