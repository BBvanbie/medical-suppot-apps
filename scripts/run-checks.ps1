param(
  [switch]$Full
)

$ErrorActionPreference = 'Stop'

$steps = @(
  @{ Name = 'lint'; Command = 'npm.cmd run lint' },
  @{ Name = 'typecheck'; Command = 'npm.cmd run typecheck' }
)

if ($Full) {
  $steps += @{ Name = 'build'; Command = 'npm.cmd run build' }
}

foreach ($step in $steps) {
  Write-Host "`n[check] running $($step.Name)..."
  Invoke-Expression $step.Command
  if ($LASTEXITCODE -ne 0) {
    throw "[check] $($step.Name) failed with exit code $LASTEXITCODE."
  }
}

Write-Host "`n[check] completed successfully."
