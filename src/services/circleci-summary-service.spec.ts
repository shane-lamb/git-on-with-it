import { createMock } from '../test-util/create-mock'
import { CircleciService, CircleJob, CircleWorkflow } from './circleci-service'
import { when } from 'jest-when'
import { CircleSummary, CircleSummaryService } from './circleci-summary-service'

describe('CircleCI summary service', () => {
    const circleciService = createMock(CircleciService)
    const service = new CircleSummaryService(circleciService)

    const branch = 'current-branch'
    const projectSlug = 'gh/my-org/my-repo'

    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('should be "not_found" when no pipeline found', async () => {
        when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue(null)

        const result = await service.getSummary(branch, projectSlug)

        expect(result).toEqual(summary({ pipelineStatus: 'not_found' }))
    })
    it('should be "succeeded" when latest unique workflows have succeeded', async () => {
        when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
        when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
            workflow({ name: 'w1', status: 'success' }),
            workflow({ name: 'w2', status: 'success' }),
            workflow({ name: 'w1', status: 'failed' }),
        ])

        const result = await service.getSummary(branch, projectSlug)

        expect(result).toEqual(summary({ pipelineStatus: 'succeeded' }))
    })
    it('should be "running" when any workflows are "running" and none are "failed"', async () => {
        when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
        when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
            workflow({ name: 'w1', status: 'success' }),
            workflow({ name: 'w2', status: 'running' }),
            workflow({ name: 'w3', status: 'on_hold', id: 'w3-id' }),
        ])
        when(circleciService.getWorkflowJobs).calledWith('w3-id').mockResolvedValue([
            job({ name: 'j1', status: 'on_hold' }),
        ])

        const result = await service.getSummary(branch, projectSlug)

        expect(result).toEqual(summary({ pipelineStatus: 'running' }))
    })
    describe('should be "running" or "needs approval" when workflow is "on hold"', () => {
        beforeEach(() => {
            when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
            when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
                workflow({ name: 'w1', status: 'success' }),
                workflow({ name: 'w2', status: 'on_hold', id: 'w2-id', pipeline_number: 234 }),
            ])
        })

        it('should be "needs approval" when remaining jobs are blocked', async () => {
            when(circleciService.getWorkflowJobs).calledWith('w2-id').mockResolvedValue([
                job({ name: 'j1', status: 'success' }),
                job({ name: 'j2', status: 'on_hold', type: 'approval', id: 'j2-id' }),
                job({ name: 'j3', status: 'blocked' }),
            ])

            const result = await service.getSummary(branch, projectSlug)

            expect(result).toEqual(summary({
                pipelineStatus: 'needs_approval',
                approvalJobs: [{
                    name: 'j2',
                    id: 'j2-id',
                    url: 'https://app.circleci.com/pipelines/github/my-org/my-repo/234/workflows/w2-id',
                }],
            }))
        })

        it('should be "running" while there are unblocked jobs', async () => {
            when(circleciService.getWorkflowJobs).calledWith('w2-id').mockResolvedValue([
                job({ name: 'j1', status: 'on_hold' }),
                job({ name: 'j2', status: 'on_hold', type: 'approval', id: 'j2-id' }),
                job({ name: 'j3', status: 'blocked' }),
            ])

            const result = await service.getSummary(branch, projectSlug)

            expect(result).toEqual(summary({
                pipelineStatus: 'running',
                approvalJobs: [{
                    name: 'j2',
                    id: 'j2-id',
                    url: 'https://app.circleci.com/pipelines/github/my-org/my-repo/234/workflows/w2-id',
                }],
            }))
        })
    })
    it.each(['failed', 'failing'])('should be "failed" when the latest of any unique workflow is "%s"', async (failureStatus: 'failed' | 'failing') => {
        when(circleciService.getLatestPipelineId).calledWith(projectSlug, branch).mockResolvedValue('pipeline1')
        when(circleciService.getWorkflows).calledWith('pipeline1').mockResolvedValue([
            workflow({ name: 'w1', status: 'success' }),
            workflow({ name: 'w2', status: failureStatus, id: 'w2-id', pipeline_number: 234 }),
            workflow({ name: 'w3', status: 'on_hold', id: 'w3-id' }),
        ])
        when(circleciService.getWorkflowJobs).calledWith('w2-id').mockResolvedValue([
            job({ name: 'j1', status: 'success' }),
            job({ name: 'j2', status: 'failed', id: 'j2-id', job_number: 456 }),
        ])
        when(circleciService.getWorkflowJobs).calledWith('w3-id').mockResolvedValue([
            job({ name: 'j3', status: 'success' }),
        ])

        const result = await service.getSummary(branch, projectSlug)

        expect(result).toEqual(summary({
            pipelineStatus: 'failed',
            failedJobs: [{
                name: 'j2',
                id: 'j2-id',
                url: 'https://app.circleci.com/pipelines/github/my-org/my-repo/234/workflows/w2-id/jobs/456',
            }],
        }))
    })

    // todo: when workflow 'canceled'
})

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

function summary(params: Partial<CircleSummary> = {}): CircleSummary {
    return {
        pipelineStatus: 'not_found',
        approvalJobs: [],
        failedJobs: [],
        ...params,
    }
}
