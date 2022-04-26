import { ConfigService } from './config-service'
import { createMock } from '../../test-util/create-mock'
import { FileService } from '../file-service'

const mockFileService = createMock(FileService)
const service = new ConfigService(mockFileService)

const realFileService = new FileService()

describe('Config Service', () => {
    it('should not be any validation errors in app config template file', () => {
        const configTemplate = realFileService.readFromProjectRoot('app-config.template.json')
        mockFileService.readFromProjectRoot.mockReturnValue(configTemplate)

        // trigger config to be validated
        service.jiraConfig()

        // should be no errors thrown!
    })
})