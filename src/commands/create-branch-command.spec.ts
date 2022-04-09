import { when } from 'jest-when'

import { CreateBranchCommand } from './create-branch-command'
import { createMock } from '../test-util/create-mock'
import { GitService } from '../services/git-service'
import { ConfigService } from '../services/config-service'
import { JiraIssue, JiraService } from '../services/jira-service'
import { PromptService } from '../services/prompt-service'

const gitService = createMock(GitService)
const configService = createMock(ConfigService)
configService.gitConfig.mockReturnValue({
    possibleBaseBranches: ['dev']
})
const jiraService = createMock(JiraService)
const promptService = createMock(PromptService)

const command = new CreateBranchCommand(gitService, configService, jiraService, promptService)

describe('Creating a branch', () => {
    beforeEach(() => {
        // Set up happy path as default,
        // behaviour can be overridden in individual tests.

        gitService.getCurrentBranch.mockResolvedValue('dev')

        const issue: Partial<JiraIssue> = {
            key: 'ISSUEKEY1',
            summary: 'a summary 1',
        }
        jiraService.getIssuesInDevelopment.mockResolvedValue([issue as JiraIssue])

        when(promptService.selectOption)
            .calledWith([{id: 'ISSUEKEY1', description: 'a summary 1'}], expect.anything())
            .mockResolvedValue('ISSUEKEY1')
    })

    describe('given happy path', () => {
        beforeEach(async () => {
            await command.execute()
        })
        it('should make sure current branch is up to date before forking', async () => {
            expect(gitService.fetchBranch).toBeCalledWith('dev')
        })
        it('should make sure current branch is up to date before forking', async () => {
            expect(gitService.createAndCheckoutBranch).toBeCalledWith('ISSUEKEY1/a-summary-1')
        })
    })

    describe('given not currently on a valid base branch', () => {
        it('should cancel branch creation', async () => {
            gitService.getCurrentBranch.mockResolvedValue('develop')

            await command.execute()

            expect(gitService.createAndCheckoutBranch).toBeCalledTimes(0)
        })
    })
})
