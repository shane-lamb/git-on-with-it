import { createMock } from './create-mock'

class TestClass {
    constructor(private someDependency: object) {
    }

    someMethod(): string {
        return 'real'
    }
}

describe('Creating mock object from a class', () => {
    it('should allow mocking of a class method', () => {
        const mock = createMock(TestClass)
        mock.someMethod.mockReturnValue('mocked')

        const result = mock.someMethod()

        expect(result).toEqual('mocked')
    })
})
