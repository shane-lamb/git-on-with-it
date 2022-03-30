import { OpenPr } from './open-pr'
import { createMock } from '../test-util/create-mock'
import { JiraService } from '../services/jira-service'
import { FileService } from '../services/file-service'
import { when } from 'jest-when'
import { PromptService } from '../services/prompt-service'

const jiraService = createMock(JiraService)
const fileService = createMock(FileService)
const promptService = createMock(PromptService)
const service = new OpenPr(jiraService, fileService, promptService)

describe('Opening a PR', () => {
    beforeEach(() => {
        // Set up happy path as default,
        // behaviour can be overridden in individual tests.

        // todo: parse issue ID from branch name
        // for now, assume branch name does not contain issue ID

        jiraService.getIssuesInDevelopment.mockResolvedValue([{
            key: 'ISSUEKEY1',
            summary: 'summary 1',
            lastViewed: '',
        }])

        when(promptService.selectOption)
            .calledWith([{id: 'ISSUEKEY1', description: 'summary 1'}], expect.anything())
            .mockResolvedValue('ISSUEKEY1')

        fileService.getGitRepoRootDirectory.mockReturnValue('/my-repo')

        when(fileService.readFile)
            .calledWith('/my-repo/.github/PULL_REQUEST_TEMPLATE.md')
            .mockReturnValue('PULL\nREQUEST\nTEMPLATE')
    })

    describe('given happy path', () => {
        it('should successfully generate PR template', async () => {
            const result = await service.execute()

            expect(result).toEqual("[ISSUEKEY1] summary 1\nPULL\nREQUEST\nTEMPLATE")
        })
    })

    describe('given git repository not found', () => {
        it('should cancel the operation', async () => {
            when(fileService.getGitRepoRootDirectory).mockReturnValue(null)

            const result = await service.execute()

            expect(result).toEqual(null)
        })
    })

    describe('given pull request template does not exist', () => {
        it('should successfully generate PR template', async () => {
            fileService.readFile.mockReturnValue(null)

            const result = await service.execute()

            expect(result).toEqual("[ISSUEKEY1] summary 1\nPR body goes here")
        })
    })

    describe('given no issues "in development"', () => {
        it('should leave the PR title blank', async () => {
            jiraService.getIssuesInDevelopment.mockResolvedValue([])

            const result = await service.execute()

            expect(result).toEqual("PR title on this line\nPULL\nREQUEST\nTEMPLATE")
        })
    })
})
