import { JiraApiFactory, JiraService } from './jira-service'
import { ConfigService } from './config-service'
import { createMock } from '../test-util/create-mock'
import JiraApi from 'jira-client'

describe('JIRA Service', () => {
    const jiraApi = createMock(JiraApi)
    let service: JiraService

    beforeEach(() => {
        const configService = createMock(ConfigService)
        configService.jiraConfig.mockReturnValueOnce({
            userId: 'my-user-id',
            host: 'my-host',
            apiToken: 'my-api-token',
            userName: 'my-user-name',
            statuses: {
                inDevelopment: 'in-development-status',
                inPrReview: 'in-pr-review-status',
                readyForDevelopment: 'ready-for-development-status',
            }
        })

        const apiFactory = createMock(JiraApiFactory)
        apiFactory.create.mockReturnValueOnce(jiraApi)

        service = new JiraService(configService, apiFactory)
    })

    it('should get issues "in development"', async () => {
        const result = await service.getIssuesInDevelopment()
        // todo
    })
})
