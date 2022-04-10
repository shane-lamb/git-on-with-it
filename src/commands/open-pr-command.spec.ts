import { OpenPrCommand } from './open-pr-command'
import { createMock } from '../test-util/create-mock'
import { JiraService } from '../services/jira-service'
import { when } from 'jest-when'
import { PromptService } from '../services/prompt-service'
import { GitService } from '../services/git-service'
import { GithubService } from '../services/github-service'
import { PrTemplateService } from '../services/pr-template-service'

const jiraService = createMock(JiraService)
const gitService = createMock(GitService)
const promptService = createMock(PromptService)
const githubService = createMock(GithubService)
const prTemplateService = createMock(PrTemplateService)

const command = new OpenPrCommand(
    jiraService,
    gitService,
    promptService,
    githubService,
    prTemplateService,
)

describe('Opening a PR', () => {
    beforeEach(() => {
        // Set up happy/typical path as default,
        // behaviour can be overridden in individual tests.

        gitService.getCurrentBranch.mockResolvedValue('current-branch')

        when(gitService.getBaseBranch)
            .calledWith('current-branch')
            .mockResolvedValue('main-branch')

        when(gitService.isChildBranchUpToDate)
            .calledWith('main-branch', 'current-branch')
            .mockResolvedValue(true)

        const issue = {
            key: 'ISSUEKEY1',
            summary: 'summary 1',
            description: 'desc 1',
        }
        jiraService.getIssuesInDevelopment.mockResolvedValue([issue])

        when(promptService.selectOption)
            .calledWith([{id: 'ISSUEKEY1', description: 'summary 1'}], expect.anything())
            .mockResolvedValue('ISSUEKEY1')

        gitService.isRepo.mockReturnValue(true)

        when(prTemplateService.getPrBody)
            .calledWith(issue)
            .mockReturnValue('pr body template')

        promptService.editText.mockImplementation(text => Promise.resolve(
            text.split('\n').map(line => line + ' - edited').join('\n'),
        ))
    })

    describe('given happy path', () => {
        beforeEach(async () => {
            await command.execute()
        })
        it('should push current branch to remote', async () => {
            expect(gitService.pushToRemote).toBeCalledWith('current-branch')
        })
        it('should create a PR', async () => {
            expect(githubService.createPr).toBeCalledWith({
                baseBranch: 'main-branch',
                childBranch: 'current-branch',
                title: '[ISSUEKEY1] summary 1 - edited',
                body: 'pr body template - edited',
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

            await command.execute()

            expect(promptService.selectOption).toBeCalledTimes(0)
            expect(githubService.createPr).toBeCalledWith(expect.objectContaining({
                title: '[ISSUEKEY1] summary 1 - edited',
            }))
        })
    })

    describe('given git repository not found', () => {
        it('should cancel the operation', async () => {
            when(gitService.isRepo).mockReturnValue(false)

            await command.execute()

            expect(githubService.createPr).toBeCalledTimes(0)
        })
    })

    describe('given no issues "in development"', () => {
        it('should use a placeholder for the PR title', async () => {
            jiraService.getIssuesInDevelopment.mockResolvedValue([])

            await command.execute()

            expect(githubService.createPr).toBeCalledWith(expect.objectContaining({
                title: 'PR title on this line - edited',
            }))
        })
    })
})
