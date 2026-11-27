import type { GitStatus } from '../../../../shared/workspace'

export interface GitStatusDescription {
  label: string
  tone: 'branch' | 'detached' | 'muted' | 'warning'
}

export function describeGitStatus(status: GitStatus): GitStatusDescription {
  switch (status.kind) {
    case 'branch':
      return { label: status.branch, tone: 'branch' }
    case 'detached':
      return { label: `detached @ ${status.commit}`, tone: 'detached' }
    case 'not-a-repository':
      return { label: 'no git repository', tone: 'muted' }
    case 'missing-folder':
      return { label: 'folder not found', tone: 'warning' }
    case 'unreadable':
      return { label: 'git status unavailable', tone: 'warning' }
  }
}
