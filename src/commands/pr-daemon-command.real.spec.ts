import { container } from 'tsyringe'
import { PrDaemonCommand } from './pr-daemon-command'

// for debugging
jest.setTimeout(999999)

describe.skip('PR daemon command', () => {
    it('should work', async () => {
        const command = container.resolve(PrDaemonCommand)
        await command.execute()
    })
})
