import { TransformService } from './transform-service'

const service = new TransformService()

describe('Transform Service', () => {
    describe('Performing text replacements', () => {
        it('should do non-regex replacement', () => {
            const result = service.doReplacements('some (text) here (text)', [{
                target: '(text)',
                replaceWith: 'stuff'
            }])

            expect(result).toEqual('some stuff here stuff')
        })
        it('should do regex replacement', () => {
            const result = service.doReplacements('first\nmiddle 1\nmiddle 2\nlast', [{
                target: 'middle.*',
                useRegex: true,
                replaceWith: 'replaced'
            }])

            expect(result).toEqual('first\nreplaced\nreplaced\nlast')
        })
    })
    describe('Substituting variables', () => {
        it('should substitute value if variable name matches', () => {
            const result = service.substituteVariables('1 ${my.var} 2 ${my.var}', {
                'my.var': 'hello'
            })

            expect(result).toEqual('1 hello 2 hello')
        })
    })
    describe('Formatting Git Branch Name', () => {
        it('should replace spaces with dashes', () => {
            // Since a valid git branch name cannot contain spaces

            const result = service.formatGitBranchName('some branch name')

            expect(result).toEqual('some-branch-name')
        })
        it('should replace square brackets [] with regular brackets ()', () => {
            // Since a valid git branch name cannot contain [

            const result = service.formatGitBranchName('[test]')

            expect(result).toEqual('(test)')
        })
        it('should remove trailing dot', () => {
            // Since a valid git branch name cannot end with a dot

            const result = service.formatGitBranchName('add feature x.')

            expect(result).toEqual('add-feature-x')
        })
        it('should replace colon with dash', () => {
            // Since a valid git branch name cannot contain a colon

            const result = service.formatGitBranchName('backend: missing validation')

            expect(result).toEqual('backend--missing-validation')
        })
    })
})