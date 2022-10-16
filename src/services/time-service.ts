import { injectable, singleton } from 'tsyringe'

@singleton()
@injectable()
export class TimeService {
    getEpochMs(): number {
        return Date.now()
    }

    sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
