import { injectable, singleton } from 'tsyringe'
import axios from 'axios'
import { ConfigService } from './config/config-service'
import { LogService } from './log-service'
import { isEqual } from 'lodash'

interface CircleItems<T> {
    items: T[]
}

export interface CircleWorkflow {
    id: string
    // failing = workflow is still running but has failed jobs, should be considered the same as failed
    status: 'on_hold' | 'running' | 'success' | 'failed' | 'failing' | 'canceled'
    name: string
    created_at: string
    stopped_at: string | null
    pipeline_number: number
}

export interface CircleJob {
    id: string
    status: 'success' | 'blocked' | 'failed' | 'canceled' | 'on_hold' | 'running' | 'not_running'
    name: string
    type: 'build' | 'approval'
    started_at: string | null
    stopped_at?: string
    job_number?: number
    dependencies: string[]
}

@singleton()
@injectable()
export class CircleciService {
    // these properties used for debugging/logging
    lastWorkflows: { [workflowId: string]: CircleWorkflow } = {}
    lastJobs: { [jobId: string]: CircleJob } = {}

    constructor(private configService: ConfigService, private log: LogService) {
    }

    async getLatestPipelineId(projectSlug: string, branchName: string): Promise<string | null> {
        const { apiToken } = this.configService.circleciConfig()
        const response = await axios.get<CircleItems<any>>(`https://circleci.com/api/v2/project/${projectSlug}/pipeline`, {
            params: {
                branch: branchName,
            },
            headers: {
                'Accept': 'application/json',
                'Circle-Token': apiToken,
            },
        })
        const latestPipeline = response.data.items[0]
        return latestPipeline ? latestPipeline.id : null
    }

    async getWorkflows(pipelineId: string): Promise<CircleWorkflow[]> {
        const { apiToken } = this.configService.circleciConfig()
        const response = await axios.get<CircleItems<CircleWorkflow>>(`https://circleci.com/api/v2/pipeline/${pipelineId}/workflow`, {
            headers: {
                'Accept': 'application/json',
                'Circle-Token': apiToken,
            },
        })
        const workflows = response.data.items
        for (const workflow of workflows) {
            if (!isEqual(this.lastWorkflows[workflow.id], workflow)) {
                this.log.write('Change in workflow', { workflow })
                this.lastWorkflows[workflow.id] = workflow
            }
        }
        return workflows
    }

    async getWorkflowJobs(workflowId: string): Promise<CircleJob[]> {
        const { apiToken } = this.configService.circleciConfig()
        const response = await axios.get<CircleItems<CircleJob>>(`https://circleci.com/api/v2/workflow/${workflowId}/job`, {
            headers: {
                'Accept': 'application/json',
                'Circle-Token': apiToken,
            },
        })
        const jobs = response.data.items
        for (const job of jobs) {
            if (!isEqual(this.lastJobs[job.id], job)) {
                this.log.write('Change in job', { job })
                this.lastJobs[job.id] = job
            }
        }
        return jobs
    }

    // Use to approve a job of type 'approval'
    async approveJob(workflowId: string, jobId: string): Promise<void> {
        const { apiToken } = this.configService.circleciConfig()
        await axios.post<any>(`https://circleci.com/api/v2/workflow/${workflowId}/approve/${jobId}`, {}, {
            headers: {
                'Accept': 'application/json',
                'Circle-Token': apiToken,
            },
        })
    }

    async cancelWorkflow(workflowId: string): Promise<void> {
        const { apiToken } = this.configService.circleciConfig()
        await axios.post<any>(`https://circleci.com/api/v2/workflow/${workflowId}/cancel`, {}, {
            headers: {
                'Accept': 'application/json',
                'Circle-Token': apiToken,
            },
        })
    }

    async rerunWorkflow(workflowId: string, fromFailed: boolean): Promise<void> {
        const { apiToken } = this.configService.circleciConfig()
        await axios.post<any>(`https://circleci.com/api/v2/workflow/${workflowId}/rerun`, {
            from_failed: fromFailed,
        }, {
            headers: {
                'Accept': 'application/json',
                'Circle-Token': apiToken,
            },
        })
    }
}
