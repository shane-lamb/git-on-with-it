import { injectable, singleton } from 'tsyringe'
import { escapeRegExp } from 'lodash'
import jira2md from 'jira2md'

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

    formatGitBranchName(unformattedName: string): string {
        // todo: not all invalid cases will resolve yet
        // see https://stackoverflow.com/a/12093994/16532962
        const substitutions = [
            [' ', '-'],
            [':', '-'],
            ['[', '('],
            [']', ')'],
        ]

        return substitutions.reduce(
            (result, [toReplace, replaceWith]) =>
                result.replace(new RegExp('\\' + toReplace, 'g'), replaceWith),
            unformattedName
        ).replace(/\.$/, '')
    }

    jiraToGithubFormat(jiraText: string): string {
        return jira2md.to_markdown(jiraText)
    }
}

export interface Transform {
    target: string,
    useRegex?: boolean,
    replaceWith: string,
}
