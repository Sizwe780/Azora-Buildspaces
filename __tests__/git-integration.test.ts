import { execFile } from 'child_process'
import { gitIntegrationService } from '../lib/services/git-integration'

jest.mock('child_process', () => ({
    execFile: jest.fn(),
}))

describe('GitIntegrationService', () => {
    const mockExecFile = execFile as unknown as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getStatus', () => {
        it('should correctly parse git status output', async () => {
            // Mock stdout for `git status --porcelain=1 -b`
            const mockStdout = `## main...origin/main [ahead 1, behind 2]
M  modified-file.ts
A  added-file.ts
D  deleted-file.ts
?? untracked-file.ts
`
            mockExecFile.mockImplementation((cmd, args, options, callback) => {
                callback(null, mockStdout, '')
            })

            const status = await gitIntegrationService.getStatus('/fake/path')

            expect(status.branch).toBe('main')
            expect(status.ahead).toBe(1)
            expect(status.behind).toBe(2)
            expect(status.isClean).toBe(false)
            expect(status.files).toHaveLength(4)

            expect(status.files[0]).toEqual({
                filepath: 'modified-file.ts',
                status: 'modified',
                staged: false,
                oldPath: undefined
            })

            expect(status.files[3]).toEqual({
                filepath: 'untracked-file.ts',
                status: 'untracked',
                staged: false,
                oldPath: undefined
            })
        })

        it('should handle clean working tree', async () => {
            const mockStdout = `## main\n`
            mockExecFile.mockImplementation((cmd, args, options, callback) => {
                callback(null, mockStdout, '')
            })

            const status = await gitIntegrationService.getStatus('/fake/path')

            expect(status.branch).toBe('main')
            expect(status.ahead).toBe(0)
            expect(status.behind).toBe(0)
            expect(status.isClean).toBe(true)
            expect(status.files).toHaveLength(0)
        })
    })

    describe('getBranches', () => {
        it('should correctly parse branch list', async () => {
            const mockStdout = `main|abcdef1|*|origin/main|ahead 1
feature|abcdef2|||\n`

            mockExecFile.mockImplementation((cmd, args, options, callback) => {
                callback(null, mockStdout, '')
            })

            const branches = await gitIntegrationService.getBranches('/fake/path')

            expect(branches).toHaveLength(2)
            expect(branches[0]).toEqual({
                name: 'main',
                oid: 'abcdef1',
                current: true,
                upstream: 'origin/main',
                ahead: 1,
                behind: 0
            })

            expect(branches[1].current).toBe(false)
        })
    })
})
