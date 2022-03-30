export function createMock<T>(configService: new (...args: any[]) => T): jest.Mocked<T> {
    return Object.getOwnPropertyNames(configService.prototype)
        .reduce((previous, current) => ({...previous, [current]: jest.fn()}), {}) as jest.Mocked<T>
}
