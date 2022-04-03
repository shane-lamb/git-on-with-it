export async function asyncMap<T, O>(array: T[], mapper: (T) => Promise<O>): Promise<O[]> {
    const output = array.map(mapper)
    return Promise.all(output)
}

export function removeNulls<T>(array: (T | null)[]): T[] {
    return array.filter(value => value !== null) as T[]
}
