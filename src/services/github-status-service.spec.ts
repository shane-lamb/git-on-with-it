import { GithubPrStatusDetails, GithubStatusService } from './github-status-service'
import { createMock } from '../test-util/create-mock'
import { GithubService, PrInfo } from './github-service'
import { when } from 'jest-when'

describe('GitHub status service', () => {
    const githubService = createMock(GithubService)
    const service = new GithubStatusService(githubService)

    const prUrl = 'https://github.com/my-org/my-repo/pull/99'
    const branchName = 'my-branch'
    const defaults: PrInfo = {
        url: prUrl,
        title: 'My PR title',
        labels: [],
        state: 'OPEN',
        baseRefName: 'develop',
        headRefName: branchName,
        mergeable: 'MERGEABLE',
        statusCheckRollup: [],
        isDraft: false,
        reviewDecision: 'REVIEW_REQUIRED',
        mergeStateStatus: 'BLOCKED',
    }

    it('should show details of PR checks', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            mergeStateStatus: 'BEHIND',
            mergeable: 'UNKNOWN',
            reviewDecision: 'REVIEW_REQUIRED',
            isDraft: true,
            statusCheckRollup: [{
                __typename: 'CheckRun',
                conclusion: 'SUCCESS',
                status: 'COMPLETED',
                detailsUrl: 'https://github.com/my-org/my-repo/actions/runs/12345/jobs/67890',
                name: 'Label the PR size',
            }, {
                __typename: 'StatusContext',
                context: 'ci/circleci: build-and-test',
                state: 'FAILURE',
                targetUrl: 'https://circleci.com/gh/my-org/my-repo/112233',
            }, {
                __typename: 'StatusContext',
                context: 'ci/circleci: lint',
                state: 'PENDING',
                targetUrl: 'https://circleci.com/gh/my-org/my-repo/445566',
            }, {
                __typename: 'StatusContext',
                context: 'ci/circleci: test-deployment',
                state: 'SUCCESS',
                targetUrl: 'https://circleci.com/gh/my-org/my-repo/556677',
            }],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'errored',
            failedChecks: [{
                name: 'ci/circleci: build-and-test',
                url: 'https://circleci.com/gh/my-org/my-repo/112233',
                isExternal: true,
            }],
            runningChecks: [{
                name: 'ci/circleci: lint',
                url: 'https://circleci.com/gh/my-org/my-repo/445566',
                isExternal: true,
            }],
            branchName
        }
        expect(result).toEqual(expected)
    })
    it('should show when is_behind', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            mergeStateStatus: 'BEHIND',
            mergeable: 'MERGEABLE',
            isDraft: true,
            reviewDecision: 'REVIEW_REQUIRED',
            statusCheckRollup: [{
                __typename: 'StatusContext',
                context: 'ci/circleci: lint',
                state: 'PENDING',
                targetUrl: 'https://circleci.com/gh/my-org/my-repo/445566',
            }],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'is_behind',
            failedChecks: [],
            runningChecks: expect.anything(),
            branchName
        }
        expect(result).toEqual(expected)
    })
    it('should show when running_checks', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            mergeStateStatus: 'UNKNOWN',
            mergeable: 'MERGEABLE',
            isDraft: true,
            reviewDecision: 'REVIEW_REQUIRED',
            statusCheckRollup: [{
                __typename: 'StatusContext',
                context: 'ci/circleci: lint',
                state: 'PENDING',
                targetUrl: 'https://circleci.com/gh/my-org/my-repo/445566',
            }],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'running_checks',
            failedChecks: [],
            runningChecks: expect.anything(),
            branchName
        }
        expect(result).toEqual(expected)
    })
    it('should show when in_draft', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            mergeStateStatus: 'UNKNOWN',
            mergeable: 'MERGEABLE',
            isDraft: true,
            reviewDecision: 'REVIEW_REQUIRED',
            statusCheckRollup: [],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'in_draft',
            failedChecks: [],
            runningChecks: [],
            branchName
        }
        expect(result).toEqual(expected)
    })
    it('should show when requires_approval', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            mergeStateStatus: 'UNKNOWN',
            mergeable: 'MERGEABLE',
            isDraft: false,
            reviewDecision: 'REVIEW_REQUIRED',
            statusCheckRollup: [],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'requires_approval',
            failedChecks: [],
            runningChecks: [],
            branchName
        }
        expect(result).toEqual(expected)
    })
    it('should show when ready_to_merge', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            mergeStateStatus: 'UNKNOWN',
            mergeable: 'MERGEABLE',
            isDraft: false,
            reviewDecision: 'APPROVED',
            statusCheckRollup: [],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'ready_to_merge',
            failedChecks: [],
            runningChecks: [],
            branchName
        }
        expect(result).toEqual(expected)
    })
    it('should show when merged', async () => {
        when(githubService.getPrInfo).calledWith(prUrl).mockResolvedValue({
            ...defaults,
            state: 'MERGED',
            mergeStateStatus: 'UNKNOWN',
            mergeable: 'UNKNOWN',
            isDraft: false,
            reviewDecision: 'APPROVED',
            statusCheckRollup: [],
        })

        const result = await service.getStatusDetails(prUrl)

        const expected: GithubPrStatusDetails = {
            status: 'merged',
            failedChecks: [],
            runningChecks: [],
            branchName
        }
        expect(result).toEqual(expected)
    })
})
