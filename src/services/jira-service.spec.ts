import JiraApi from 'jira-client'
import { when } from 'jest-when'

import { JiraApiFactory, JiraService } from './jira-service'
import { ConfigService } from './config/config-service'
import { createMock } from '../test-util/create-mock'

describe('JIRA Service', () => {
    const jiraApi = createMock(JiraApi)
    let service: JiraService

    beforeEach(() => {
        const configService = createMock(ConfigService)
        configService.jiraConfig.mockReturnValue({
            userId: 'my-user-id',
            host: 'my-host',
            apiToken: 'my-api-token',
            userName: 'my-user-name',
            statuses: {
                inDevelopment: 'in-development-status',
                inPrReview: 'in-pr-review-status',
                readyForDevelopment: 'ready-for-development-status',
            },
        })

        const apiFactory = createMock(JiraApiFactory)
        apiFactory.create.mockReturnValueOnce(jiraApi)

        service = new JiraService(configService, apiFactory)
    })

    it('should get issues "in development"', async () => {
        const response = {
            expand: 'names,schema',
            startAt: 0,
            maxResults: 50,
            total: 1,
            issues: [
                {
                    expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
                    id: '1234567',
                    key: 'CODE-4444',
                    fields: {
                        summary: 'Create an endpoint',
                        description: 'Some link [here|https://google.com], and some points below:\n\n* Point 1\n* Point 2\n',
                    },
                },
            ],
        }
        when(jiraApi.searchJira)
            .calledWith(
                `status in ("in-development-status") AND assignee in (my-user-id)`,
                expect.anything(),
            )
            .mockResolvedValue(response as never)

        const result = await service.getIssuesInDevelopment()

        expect(result).toEqual([{
            key: 'CODE-4444',
            summary: 'Create an endpoint',
            description: 'Some link [here|https://google.com], and some points below:\n\n* Point 1\n* Point 2\n',
        }])
    })
})
