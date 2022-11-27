import { injectable, singleton } from 'tsyringe'
import { CircleciService, CircleJob, CircleWorkflow } from './circleci-service'
import { uniqBy, flatten } from 'lodash'

export interface CircleSummaryJob {
    id: string,
    name: string,
    url: string,
}

export interface CircleSummary {
    pipelineStatus: 'not_found' | 'running' | 'needs_approval' | 'failed' | 'succeeded'
    failedJobs: CircleSummaryJob[]
    approvalJobs: CircleSummaryJob[]
}

type CircleJobWithWorkflow = CircleJob & { workflow: CircleWorkflow }

@singleton()
@injectable()
export class CircleSummaryService {
    constructor(private circleciService: CircleciService) {
    }

    public async getSummary(branchName: string, projectSlug: string): Promise<CircleSummary> {
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

        const [ onHoldWorkflowJobs, failedJobs ] = await Promise.all([
            this.getWorkflowJobs(onHoldWorkflows),
            this.getFailedJobs(failedWorkflows, projectSlug),
        ])

        return {
            pipelineStatus: failedWorkflows.length ? 'failed' :
                incompleteWorkflows.length ? this.getIncompleteStatus(onHoldWorkflowJobs) : 'succeeded',
            failedJobs,
            approvalJobs: this.getApprovalJobs(onHoldWorkflowJobs, projectSlug),
        }
    }

    private getIncompleteStatus(onHoldWorkflowJobs: CircleJobWithWorkflow[]): CircleSummary['pipelineStatus'] {
        const incompleteJobs = onHoldWorkflowJobs
            .filter(job => job.type === 'build')
            .filter(job => job.status !== 'success')
        if (incompleteJobs.every(job => job.status === 'blocked')) {
            return 'needs_approval'
        }
        return 'running'
    }

    private async getWorkflowJobs(workflows: CircleWorkflow[]): Promise<CircleJobWithWorkflow[]> {
        const workflowResults = await Promise.all(workflows.map(
            workflow => this.circleciService.getWorkflowJobs(workflow.id).then(jobs => jobs.map(
                job => ({ ...job, workflow }),
            )),
        ))
        return flatten(workflowResults)
    }

    private getApprovalJobs(onHoldWorkflowJobs: CircleJobWithWorkflow[], projectSlug: string): CircleSummaryJob[] {
        const baseUrl = this.getCircleciBaseUrl(projectSlug)
        return onHoldWorkflowJobs
            .filter(job => job.type === 'approval')
            .map(job => ({
                name: job.name,
                id: job.id,
                url: `${baseUrl}/${job.workflow.pipeline_number}/workflows/${job.workflow.id}`,
            }))
    }

    private async getFailedJobs(failedWorkflows: CircleWorkflow[], projectSlug: string): Promise<CircleSummaryJob[]> {
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
