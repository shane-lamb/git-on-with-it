import { OpenPr } from './open-pr'
import { createMock } from '../test-util/create-mock'
import { JiraService } from '../services/jira-service'
import { FileService } from '../services/file-service'
import { when } from 'jest-when'
import { PromptService } from '../services/prompt-service'
import { GitService } from '../services/git-service'
import { GithubService } from '../services/github-service'

const jiraService = createMock(JiraService)
const gitService = createMock(GitService)
const fileService = createMock(FileService)
const promptService = createMock(PromptService)
const githubService = createMock(GithubService)

const service = new OpenPr(
    jiraService,
    gitService,
    fileService,
    promptService,
    githubService,
)

describe('Opening a PR', () => {
    beforeEach(() => {
        // Set up happy path as default,
        // behaviour can be overridden in individual tests.

        // todo: parse issue ID from branch name
        // for now, assume branch name does not contain issue ID

        gitService.getCurrentBranch.mockResolvedValue('current-branch')

        when(gitService.getBaseBranch)
            .calledWith('current-branch')
            .mockResolvedValue('main-branch')

        when(gitService.isChildBranchUpToDate)
            .calledWith('main-branch', 'current-branch')
            .mockResolvedValue(true)

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
            .calledWith('/my-repo', '.github', 'PULL_REQUEST_TEMPLATE.md')
            .mockReturnValue('PULL REQUEST TEMPLATE')

        promptService.editText.mockImplementation(text => Promise.resolve(
            text.split('\n').map(line => line + ' - edited').join('\n'),
        ))
    })

    describe('given happy path', () => {
        beforeEach(async () => {
            await service.execute()
        })
        it('should push current branch to remote', async () => {
            expect(gitService.pushToRemote).toBeCalledWith('current-branch')
        })
        it('should create a PR', async () => {
            expect(githubService.createPr).toBeCalledWith({
                baseBranch: 'main-branch',
                childBranch: 'current-branch',
                title: '[ISSUEKEY1] summary 1 - edited',
                body: 'PULL REQUEST TEMPLATE - edited',
            })
        })
    })

    describe('given current branch contains JIRA issue ID in the name', () => {
        it('should auto-select that JIRA issue', async () => {
            gitService.getCurrentBranch.mockResolvedValue('branch-ISSUEKEY1-name')

            when(gitService.getBaseBranch)
                .calledWith('branch-ISSUEKEY1-name')
                .mockResolvedValue('main-branch')

            when(gitService.isChildBranchUpToDate)
                .calledWith('main-branch', 'branch-ISSUEKEY1-name')
                .mockResolvedValue(true)

            await service.execute()

            expect(promptService.selectOption).toBeCalledTimes(0)
            expect(githubService.createPr).toBeCalledWith(expect.objectContaining({
                title: '[ISSUEKEY1] summary 1 - edited',
            }))
        })
    })

    describe('given git repository not found', () => {
        it('should cancel the operation', async () => {
            when(fileService.getGitRepoRootDirectory).mockReturnValue(null)

            await service.execute()

            expect(githubService.createPr).toBeCalledTimes(0)
        })
    })

    describe('given pull request template does not exist', () => {
        it('should successfully generate PR template', async () => {
            fileService.readFile.mockReturnValue(null)

            await service.execute()

            expect(githubService.createPr).toBeCalledWith(expect.objectContaining({
                body: 'PR body goes here - edited',
            }))
        })
    })

    describe('given pull request template contains multiple lines', () => {
        it('should include all lines in body', async () => {
            fileService.readFile.mockReturnValue('template line 1\ntemplate line 2')

            await service.execute()

            expect(githubService.createPr).toBeCalledWith(expect.objectContaining({
                body: 'template line 1 - edited\ntemplate line 2 - edited',
            }))
        })
    })

    describe('given no issues "in development"', () => {
        it('should use a placeholder for the PR title', async () => {
            jiraService.getIssuesInDevelopment.mockResolvedValue([])

            await service.execute()

            expect(githubService.createPr).toBeCalledWith(expect.objectContaining({
                title: 'PR title on this line - edited',
            }))
        })
    })
})
