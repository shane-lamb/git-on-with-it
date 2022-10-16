import { CiStatus, CiStatusService } from './ci-status-service'
import { createMock } from '../test-util/create-mock'
import { CircleciService, CircleJob, CircleWorkflow } from './circleci-service'
import { GithubService, PrInfo } from './github-service'
import { when } from 'jest-when'

describe('CI status checker', () => {
    const circleciService = createMock(CircleciService)
    const githubService = createMock(GithubService)
    const service = new CiStatusService(circleciService, githubService)

    const branch = 'current-branch'
    const gitRemoteUrl = 'git@github.com:my-org/my-repo.git'
    const projectSlug = 'gh/my-org/my-repo'

    beforeEach(() => {
        jest.resetAllMocks()
    })

    describe('checking PR status', () => {
        beforeEach(() => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue(null)
        })
        it('should be "not_created" when no PR info', async () => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(null)

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ prStatus: 'not_created', prUrl: undefined }))
        })
        it('should be "in_draft" when in draft', async () => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(prInfo({ isDraft: true }))

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ prStatus: 'in_draft' }))
        })
        it('should be "needs_approval" when needs approval', async () => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(prInfo({ reviewDecision: 'REVIEW_REQUIRED' }))

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ prStatus: 'needs_approval' }))
        })
        it('should be "is_behind" when missing changes from base', async () => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(prInfo({ mergeStateStatus: 'BEHIND' }))

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ prStatus: 'is_behind' }))
        })

        // todo: merge conflict status

        it('should be "ready_to_merge" when all checks have passed', async () => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(prInfo({ reviewDecision: 'APPROVED' }))

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ prStatus: 'ready_to_merge' }))
        })
        it('should be "merged" when merged', async () => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(prInfo({ state: 'MERGED' }))

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ prStatus: 'merged' }))
        })
    })
    describe('checking pipeline status', () => {
        beforeEach(() => {
            when(githubService.getPrInfo).calledWith(branch).mockResolvedValue(prInfo())
        })
        it('should be "not_found" when no pipeline found', async () => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue(null)

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ pipelineStatus: 'not_found' }))
        })
        it('should be "running" when no failures and not yet completed', async () => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
            // todo

            const result = await service.getStatus(branch, gitRemoteUrl)

            // expect(result).toEqual(ciStatus({ pipelineStatus: 'succeeded' }))
        })
        it('should be "succeeded" when latest unique workflows have succeeded', async () => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
            when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
                workflow({ name: 'w1', status: 'success' }),
                workflow({ name: 'w2', status: 'success' }),
                workflow({ name: 'w1', status: 'failed' }),
            ])

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ pipelineStatus: 'succeeded' }))
        })
        it.each(['running', 'on_hold'])('should be "running" when any workflows are "%s"', async (incompleteStatus: 'running' | 'on_hold') => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
            when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
                workflow({ name: 'w1', status: 'success' }),
                workflow({ name: 'w2', status: incompleteStatus }),
            ])

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({ pipelineStatus: 'running' }))
        })
        it.each(['failed', 'failing'])('should be "failed" when the latest of any unique workflow is "%s"', async (failureStatus: 'failed' | 'failing') => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
            when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
                workflow({ name: 'w1', status: 'success' }),
                workflow({ name: 'w2', status: failureStatus, id: 'w2-id', pipeline_number: 234 }),
            ])
            when(circleciService.getWorkflowJobs).calledWith('w2-id').mockResolvedValue([
                job({ name: 'j1', status: 'success'}),
                job({ name: 'j2', status: 'failed', id: 'j2-id', job_number: 456}),
            ])

            const result = await service.getStatus(branch, gitRemoteUrl)

            expect(result).toEqual(ciStatus({
                pipelineStatus: 'failed', failedJobs: [{
                    name: 'j2',
                    id: 'j2-id',
                    url: 'https://app.circleci.com/pipelines/github/my-org/my-repo/234/workflows/w2-id/jobs/456',
                }],
            }))
        })
    })
})

function prInfo(params: Partial<PrInfo> = {}): PrInfo {
    return {
        state: 'OPEN',
        mergeStateStatus: 'UNKNOWN',
        reviewDecision: 'REVIEW_REQUIRED',
        mergeable: 'MERGEABLE',
        statusCheckRollup: [],
        baseRefName: 'main',
        headRefName: 'current-branch',
        isDraft: false,
        labels: [],
        url: 'https://github.com',
        title: 'My First PR',
        ...params,
    }
}

function workflow(params: Partial<CircleWorkflow> = {}): CircleWorkflow {
    return {
        id: 'workflow-id',
        name: 'Workflow',
        status: 'success',
        created_at: 'sometime',
        pipeline_number: 123,
        stopped_at: 'sometime',
        ...params,
    }
}

function job(params: Partial<CircleJob> = {}): CircleJob {
    return {
        id: 'job-id',
        name: 'Job',
        status: 'success',
        type: 'build',
        dependencies: [],
        started_at: null,
        ...params,
    }
}

function ciStatus(params: Partial<CiStatus> = {}): CiStatus {
    return {
        prStatus: 'needs_approval',
        pipelineStatus: 'not_found',
        approvalJobs: [],
        failedJobs: [],
        prUrl: 'https://github.com',
        ...params,
    }
}
