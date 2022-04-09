import { injectable, singleton } from 'tsyringe'
import { escapeRegExp } from 'lodash'

@singleton()
@injectable()
export class TransformService {
    doReplacements(text: string, transforms: Transform[]): string {
        return transforms.reduce((prev, transform) => {
            const regex = new RegExp(
                transform.useRegex ? transform.target : escapeRegExp(transform.target),
                'g',
            )
            return prev.replace(regex, transform.replaceWith)
        }, text)
    }

    substituteVariables(text: string, variables: { [name: string]: string }): string {
        return Object.entries(variables).reduce((prev, [key, value]) => {
            const regex = new RegExp(escapeRegExp('${' + key + '}'), 'g')
            return prev.replace(regex, value)
        }, text)
    }
}

export interface Transform {
    target: string,
    useRegex?: boolean,
    replaceWith: string,
}
