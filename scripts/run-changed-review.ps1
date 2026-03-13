$ErrorActionPreference = 'Stop'

$lines = git status --short
if (-not $lines) {
  Write-Host 'No local changes detected.'
  exit 0
}

$files = @($lines | ForEach-Object { $_.Substring(3).Trim() })
$skills = New-Object System.Collections.Generic.HashSet[string]

foreach ($file in $files) {
  if ($file -match '^(docs/|docs\\)' -or $file -in @('README.md', 'AGENTS.md', 'MIGRATION_NOTES.md')) {
    [void]$skills.Add('docs-writer')
  }
  if ($file -match '^(app/|app\\|components/|components\\)') {
    [void]$skills.Add('frontend-ui')
  }
  if ($file -match '^(app/api/|app\\api\\|lib\\.*(Repository|Schema|Validation)|lib/.*(Repository|Schema|Validation)|proxy\.ts|auth)') {
    [void]$skills.Add('api-implementation')
  }
  if ($file -match '^(scripts/.*\.sql|scripts\\.*\.sql|scripts/seed_|scripts\\seed_|lib/db|lib\\db|lib/.*Repository|lib\\.*Repository)') {
    [void]$skills.Add('db-design')
  }
  if ($file -match '^(app/api/|app\\api\\|lib/auth|lib\\auth|lib/audit|lib\\audit|proxy\.ts|auth\.config\.ts|auth\.ts)') {
    [void]$skills.Add('security-audit')
  }
}

if ($files.Count -gt 1) {
  [void]$skills.Add('test-check')
}

Write-Host 'Changed files:'
$lines | ForEach-Object { Write-Host "- $_" }

Write-Host "`nSuggested Codex skills:"
$skills | ForEach-Object { Write-Host "- $_" }

Write-Host "`nSuggested verification:"
Write-Host '- npm run check'
if ($files | Where-Object { $_ -match '^(app/|app\\|components/|components\\|lib/|lib\\)' }) {
  Write-Host '- Consider npm run check:full'
}
if ($files | Where-Object { $_ -match '^(app/|app\\|components/|components\\)' }) {
  Write-Host '- Consider npm run test:e2e for workflow-impacting UI changes'
}
