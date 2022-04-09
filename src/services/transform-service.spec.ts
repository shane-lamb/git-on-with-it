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
})