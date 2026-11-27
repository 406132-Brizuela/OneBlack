import type { GitStatus } from '../../../../shared/workspace'
import { describeGitStatus } from './describe-git-status'

export function GitBadge({ status }: { status: GitStatus }) {
  const { label, tone } = describeGitStatus(status)

  return (
    <span className="git-badge" data-tone={tone} title={label}>
      {label}
    </span>
  )
}
