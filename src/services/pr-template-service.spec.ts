import { PrTemplateService } from './pr-template-service'
import { ConfigService, PullRequestConfig } from './config-service'
import { FileService } from './file-service'
import { TransformService } from './transform-service'
import { createMock } from '../test-util/create-mock'
import { JiraIssue } from './jira-service'
import { when } from 'jest-when'

const configService = createMock(ConfigService)
const fileService = createMock(FileService)
const transformService = createMock(TransformService)

const service = new PrTemplateService(configService, fileService, transformService)

describe('PR Template Service', () => {
    describe('Generating body of PR', () => {
        beforeEach(() => {
            // establish typical/happy path

            const config: Partial<PullRequestConfig> = {
                template: {
                    replacements: [{
                        target: 'find',
                        replaceWith: 'replace',
                    }],
                },
            }
            configService.pullRequestConfig.mockReturnValue(config as PullRequestConfig)

            // we are in a git repo, and it has a pull request template file
            fileService.getGitRepoRootDirectory.mockReturnValue('/my-repo')
            when(fileService.readFile)
                .calledWith('/my-repo', '.github', 'PULL_REQUEST_TEMPLATE.md')
                .mockReturnValue('template file')

            // simple implementations for transform functions,
            // so we can test they are applied, and in the right order
            transformService.doReplacements.mockImplementation(text => text + ' - with replace')
            transformService.substituteVariables.mockImplementation(text => text + ' - with vars')
            transformService.jiraToGithubFormat.mockImplementation(text => text + ' - to GH format')
        })

        it('should generate PR body', () => {
            const result = service.getPrBody(null)

            expect(result).toEqual('template file - with replace - with vars')
        })

        it('should use config for replacements', () => {
            service.getPrBody(null)

            expect(transformService.doReplacements).toBeCalledWith('template file', [{
                target: 'find',
                replaceWith: 'replace',
            }])
        })

        describe('given no template file found', () => {
            it('should use default template', () => {
                fileService.readFile.mockReturnValue(null)

                const result = service.getPrBody(null)

                expect(result).toEqual('PR body goes here - with replace - with vars')
            })
        })

        describe('given has a JIRA issue', () => {
            it('should perform variable substitutions (and use GitHub formatting for description)', () => {
                const issue: JiraIssue = {
                    key: 'ISSUE-KEY',
                    description: 'some desc here',
                    summary: 'some title here',
                }

                service.getPrBody(issue)

                expect(transformService.substituteVariables)
                    .toBeCalledWith(
                        'template file - with replace',
                        {
                            'issue.key': 'ISSUE-KEY',
                            'issue.description': 'some desc here - to GH format',
                            'issue.summary': 'some title here',
                        },
                    )
            })
        })
    })
})