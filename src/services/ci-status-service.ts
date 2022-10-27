import { injectable, singleton } from 'tsyringe'
import { CircleciService, CircleJob, CircleWorkflow } from './circleci-service'
import { GithubService } from './github-service'
import { uniqBy, flatten } from 'lodash'

export interface CiJobStatus {
    id: string,
    name: string,
    url: string,
}

interface PrStatus {
    prStatus: 'not_created' | 'in_draft' | 'needs_approval' | 'is_behind' | 'merge_conflict' | 'ready_to_merge' | 'merged'
    prUrl?: string
}

interface PipelineStatus {
    pipelineStatus: 'not_found' | 'running' | 'needs_approval' | 'failed' | 'succeeded'
    failedJobs: CiJobStatus[]
    approvalJobs: CiJobStatus[]
}

export type CiStatus = PrStatus & PipelineStatus

type CircleJobWithWorkflow = CircleJob & { workflow: CircleWorkflow }

@singleton()
@injectable()
export class CiStatusService {
    constructor(private circleciService: CircleciService, private githubService: GithubService) {
    }

    async getStatus(branchName: string, gitRemoteUrl: string): Promise<CiStatus> {
        const [prStatus, pipelineStatus] = await Promise.all([
            this.getPrStatus(branchName),
            this.getPipelineStatus(branchName, gitRemoteUrl),
        ])

        return {
            ...prStatus,
            ...pipelineStatus,
        }
    }

    private async getPipelineStatus(branchName: string, gitRemoteUrl: string): Promise<PipelineStatus> {
        const projectSlug = gitRemoteUrl
            .replace('git@github.com:', 'gh/')
            .replace('.git', '')

        const pipelineId = await this.circleciService.getLatestPipelineId(projectSlug, branchName)
        if (!pipelineId) {
            return {
                pipelineStatus: 'not_found',
                failedJobs: [],
                approvalJobs: [],
            }
        }
        const workflows = await this.circleciService.getWorkflows(pipelineId)
        const uniqueWorkflows = uniqBy(workflows, workflow => workflow.name)
        const failedWorkflows = uniqueWorkflows.filter(workflow => ['failed', 'failing'].includes(workflow.status))
        const onHoldWorkflows = uniqueWorkflows.filter(workflow => workflow.status === 'on_hold')
        const incompleteWorkflows = uniqueWorkflows.filter(workflow => ['running', 'on_hold'].includes(workflow.status))
        const onHoldWorkflowJobs = await this.getWorkflowJobs(onHoldWorkflows)

        return {
            pipelineStatus: failedWorkflows.length ? 'failed' :
                incompleteWorkflows.length ? this.getIncompleteStatus(onHoldWorkflowJobs) : 'succeeded',
            failedJobs: await this.getFailedJobs(failedWorkflows, projectSlug),
            approvalJobs: await this.getApprovalJobs(onHoldWorkflowJobs, projectSlug),
        }
    }

    private getIncompleteStatus(onHoldWorkflowJobs: CircleJobWithWorkflow[]): PipelineStatus['pipelineStatus'] {
        const incompleteJobs = onHoldWorkflowJobs
            .filter(job => job.type === 'build')
            .filter(job => job.status !== 'success')
        if (incompleteJobs.every(job => job.status === 'blocked')) {
            return 'needs_approval'
        }
        return 'running'
    }

    private async getPrStatus(branchName: string): Promise<PrStatus> {
        const prInfo = await this.githubService.getPrInfo(branchName)
        if (!prInfo) return { prStatus: 'not_created' }
        const prUrl = prInfo.url
        if (prInfo.state === 'MERGED') return { prStatus: 'merged', prUrl }
        if (prInfo.isDraft) return { prStatus: 'in_draft', prUrl }
        // todo: merge conflict status
        if (prInfo.mergeStateStatus === 'BEHIND') return { prStatus: 'is_behind', prUrl }
        if (prInfo.reviewDecision === 'REVIEW_REQUIRED') return { prStatus: 'needs_approval', prUrl }
        return { prStatus: 'ready_to_merge', prUrl }
    }

    private async getWorkflowJobs(workflows: CircleWorkflow[]): Promise<CircleJobWithWorkflow[]> {
        const workflowResults = await Promise.all(workflows.map(
            workflow => this.circleciService.getWorkflowJobs(workflow.id).then(jobs => jobs.map(
                job => ({ ...job, workflow }),
            )),
        ))
        return flatten(workflowResults)
    }

    private async getApprovalJobs(onHoldWorkflowJobs: CircleJobWithWorkflow[], projectSlug: string): Promise<CiJobStatus[]> {
        const baseUrl = this.getCircleciBaseUrl(projectSlug)
        return onHoldWorkflowJobs
            .filter(job => job.type === 'approval')
            .map(job => ({
                name: job.name,
                id: job.id,
                url: `${baseUrl}/${job.workflow.pipeline_number}/workflows/${job.workflow.id}`,
            }))
    }

    private async getFailedJobs(failedWorkflows: CircleWorkflow[], projectSlug: string): Promise<CiJobStatus[]> {
        const jobs = await this.getWorkflowJobs(failedWorkflows)
        const baseUrl = this.getCircleciBaseUrl(projectSlug)
        return jobs
            .filter(job => job.status === 'failed')
            .map(job => ({
                name: job.name,
                id: job.id,
                url: `${baseUrl}/${job.workflow.pipeline_number}/workflows/${job.workflow.id}/jobs/${job.job_number}`,
            }))
    }

    private getCircleciBaseUrl(projectSlug: string) {
        return 'https://app.circleci.com/pipelines/' + projectSlug.replace(/^gh/, 'github')
    }
}
