<#
.SYNOPSIS
    Promptbook Windows bootstrap: prepares Node.js, npm and Git, installs the exact released ptbk version globally,
    prepares an empty first-project folder and opens a terminal that runs the ordinary interactive `ptbk init` there.

.DESCRIPTION
    A thin onboarding layer, not a second engine or initializer: project setup, tools, login, Git and the background
    start all stay with `ptbk init`. Existing compatible prerequisites are reused; only missing ones are installed from
    official distributions. Nothing is silently replaced or downgraded. Re-running is safe: satisfied steps are reused,
    a nonempty folder is never treated as a new empty project, and PATH entries are not duplicated.

    Exit codes: 0 handed off (or prepared with -NoLaunch) · 2 CLI installed, project skipped · 3 a decision is needed
    (incompatible prerequisite or a different installed ptbk version) · 4 project folder problem · 5 download or
    installation failure · 6 terminal handoff failure.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $PromptbookVersion,
    [string] $ProjectsRoot = (Join-Path $env:USERPROFILE 'Promptbook'),
    [string] $ProjectName = 'my-first-project',
    [switch] $SkipProject,
    [switch] $AllowPtbkReplacement,
    [switch] $Plan,
    [switch] $NoLaunch,
    [string] $PackageSpec,
    # Validation only: see exactly the current process PATH (simulates a machine without the runner's tools).
    [switch] $IsolatedPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$script:LogDirectory = Join-Path $env:LOCALAPPDATA 'Promptbook\installer'
New-Item -ItemType Directory -Force -Path $script:LogDirectory | Out-Null
$script:LogFile = Join-Path $script:LogDirectory ("bootstrap-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$script:Step = 0
$script:Total = if ($SkipProject) { 4 } else { 6 }

# Native programs may write progress to stderr; in Windows PowerShell 5.1 that must not become a terminating error.
function Invoke-Native([scriptblock] $Block) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Block } finally { $ErrorActionPreference = $previous }
}

function Write-Log([string] $Text) {
    Add-Content -LiteralPath $script:LogFile -Value ("{0} {1}" -f (Get-Date -Format o), $Text) -Encoding UTF8
}

function Write-Step([string] $Text) {
    $script:Step++
    $line = "[{0}/{1}] {2}" -f $script:Step, $script:Total, $Text
    Write-Host $line -ForegroundColor Cyan
    Write-Log $line
}

function Write-Detail([string] $Text) {
    Write-Host "      $Text"
    Write-Log "      $Text"
}

function Stop-Bootstrap([int] $Code, [string] $Stage, [string] $Message, [string] $NextAction) {
    Write-Host ''
    Write-Host "Not completed: $Stage" -ForegroundColor Yellow
    Write-Host "  $Message"
    if ($NextAction) { Write-Host "  Next: $NextAction" }
    Write-Host "  Diagnostics: $script:LogFile"
    Write-Log "STOP $Code [$Stage] $Message | next: $NextAction"
    exit $Code
}

# The executables a new terminal will see: machine and user PATH from the registry (fresh installs included), plus
# npm's per-user global bin. Nothing is written to PATH here.
function Update-SessionPath {
    if ($IsolatedPath) { return }
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = New-Object System.Collections.Generic.List[string]
    foreach ($part in (@($machine, $user, (Join-Path $env:APPDATA 'npm')) -join ';').Split(';')) {
        if ($part -and -not $entries.Contains($part)) { $entries.Add($part) }
    }
    $env:Path = $entries -join ';'
}

function Get-Tool([string] $Command, [string[]] $Arguments) {
    $found = Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) { return $null }
    try {
        $output = Invoke-Native { & $found.Source @Arguments 2>$null } | Select-Object -First 1
    } catch {
        return @{ Path = $found.Source; Version = $null; Usable = $false }
    }
    if ($LASTEXITCODE -ne 0 -or -not $output) { return @{ Path = $found.Source; Version = $null; Usable = $false } }
    $match = [regex]::Match([string] $output, '(\d+)\.(\d+)\.(\d+)')
    if (-not $match.Success) { return @{ Path = $found.Source; Version = $null; Usable = $false } }
    return @{ Path = $found.Source; Version = [version] ("{0}.{1}.{2}" -f $match.Groups[1].Value, $match.Groups[2].Value, $match.Groups[3].Value); Usable = $true }
}

# ptbk requires Node.js ^22.13.0 || >=24 and npm >= 10 (package.json "engines").
function Test-NodeCompatible([version] $Version) {
    return ($Version.Major -eq 22 -and $Version -ge [version] '22.13.0') -or ($Version.Major -ge 24)
}

function Install-WithWinget([string] $Id, [string] $Name) {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) { return $false }
    Write-Detail "Installing $Name with winget (official package $Id)…"
    Invoke-Native { & $winget.Source install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements 2>&1 } | ForEach-Object { Write-Log "winget: $_" }
    return ($LASTEXITCODE -eq 0)
}

function Get-VerifiedDownload([string] $Url, [string] $ExpectedSha256, [string] $FileName) {
    $target = Join-Path $env:TEMP $FileName
    Write-Detail "Downloading $Url"
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $target
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash.ToLowerInvariant()
    if ($actual -ne $ExpectedSha256.ToLowerInvariant()) {
        Remove-Item -LiteralPath $target -Force
        throw "The download of $FileName failed its SHA-256 verification."
    }
    return $target
}

function Install-NodeFromNodejsOrg {
    # The official Node.js 22 LTS MSI, verified against the release's SHASUMS256.txt.
    $base = 'https://nodejs.org/dist/latest-v22.x/'
    $sums = (Invoke-WebRequest -UseBasicParsing -Uri ($base + 'SHASUMS256.txt')).Content
    $line = ($sums -split "`n") | Where-Object { $_ -match 'node-v22\.\d+\.\d+-x64\.msi$' } | Select-Object -First 1
    if (-not $line) { throw 'The Node.js release index has no x64 MSI.' }
    $parts = $line.Trim() -split '\s+'
    $msi = Get-VerifiedDownload ($base + $parts[1]) $parts[0] $parts[1]
    Write-Detail 'Installing Node.js (Windows asks for permission)…'
    $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ('"{0}"' -f $msi), '/qn', '/norestart') -Verb RunAs -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "The Node.js installer exited with $($process.ExitCode)." }
}

function Install-GitFromGitForWindows {
    # The official Git for Windows installer, verified against the checksum table of its GitHub release.
    $release = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{ 'User-Agent' = 'promptbook-installer' }
    $asset = $release.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1
    if (-not $asset) { throw 'The Git for Windows release has no 64-bit installer.' }
    $match = [regex]::Match([string] $release.body, [regex]::Escape($asset.name) + '\s*\|\s*([0-9a-fA-F]{64})')
    if (-not $match.Success) { throw 'The Git for Windows release does not publish a checksum for its installer.' }
    $installer = Get-VerifiedDownload $asset.browser_download_url $match.Groups[1].Value $asset.name
    Write-Detail 'Installing Git (Windows may ask for permission)…'
    $process = Start-Process -FilePath $installer -ArgumentList @('/VERYSILENT', '/NORESTART', '/SP-') -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "The Git installer exited with $($process.ExitCode)." }
}

function Test-ValidFolderName([string] $Name) {
    if (-not $Name -or $Name.Trim() -ne $Name -or $Name.EndsWith('.')) { return $false }
    if ($Name -eq '.' -or $Name -eq '..') { return $false }
    if ($Name.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) { return $false }
    if ($Name -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$') { return $false }
    return $true
}

function ConvertTo-PowerShellLiteral([string] $Text) {
    return "'" + $Text.Replace("'", "''") + "'"
}

Write-Log "Promptbook bootstrap for ptbk $PromptbookVersion (plan: $Plan, skip project: $SkipProject)"
Write-Host "Promptbook $PromptbookVersion — preparing your computer" -ForegroundColor White
Write-Host 'This installs what ptbk needs, then opens the setup assistant (ptbk init) in a terminal.'
Write-Host ''

# 1. Node.js and npm (reused when compatible; never a duplicate Node.js just to obtain npm).
Write-Step 'Node.js and npm'
Update-SessionPath
$node = Get-Tool 'node' @('--version')
if ($node -and $node.Usable -and -not (Test-NodeCompatible $node.Version)) {
    Stop-Bootstrap 3 'Node.js' "Node.js $($node.Version) at $($node.Path) is installed, but ptbk needs ^22.13.0 or 24 and newer." 'Update Node.js yourself (https://nodejs.org) or remove it, then run this installer again. Your installation was not changed.'
}
if ($node -and -not $node.Usable) {
    Stop-Bootstrap 3 'Node.js' "Node.js at $($node.Path) does not run." 'Repair or reinstall Node.js, then run this installer again. Nothing was changed.'
}
if (-not $node) {
    if ($Plan) { Write-Detail 'PLAN: Node.js is missing and would be installed (winget OpenJS.NodeJS.LTS, else the verified nodejs.org MSI).' }
    else {
        try {
            if (-not (Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS')) { Install-NodeFromNodejsOrg }
        } catch { Stop-Bootstrap 5 'Node.js installation' $_.Exception.Message 'Check the network connection and click Retry (installed tools are reused).' }
        Update-SessionPath
        $node = Get-Tool 'node' @('--version')
        if (-not $node -or -not $node.Usable) { Stop-Bootstrap 5 'Node.js installation' 'Node.js is still not available after its installation.' 'Restart Windows if the Node.js installer asked for it, then click Retry.' }
    }
}
if ($node) { Write-Detail "Node.js $($node.Version) at $($node.Path)" }
$npm = Get-Tool 'npm.cmd' @('--version')
if ($node -and -not $npm) {
    Stop-Bootstrap 3 'npm' "Node.js is installed at $($node.Path), but npm is missing from it." 'Reinstall Node.js including npm (https://nodejs.org), then run this installer again. Node.js was not changed.'
}
if ($npm -and $npm.Version.Major -lt 10) {
    Stop-Bootstrap 3 'npm' "npm $($npm.Version) is older than the required npm 10." 'Update npm (npm install -g npm@latest) or Node.js, then run this installer again.'
}
if ($npm) { Write-Detail "npm $($npm.Version)" }

# 2. Git (reused when present; the installer never configures a Git identity or requires a GitHub account).
Write-Step 'Git'
$gitTool = Get-Tool 'git' @('--version')
if ($gitTool -and -not $gitTool.Usable) { Stop-Bootstrap 3 'Git' "Git at $($gitTool.Path) does not run." 'Repair or reinstall Git, then run this installer again. Nothing was changed.' }
if (-not $gitTool) {
    if ($Plan) { Write-Detail 'PLAN: Git is missing and would be installed (winget Git.Git, else the verified Git for Windows installer).' }
    else {
        try {
            if (-not (Install-WithWinget 'Git.Git' 'Git')) { Install-GitFromGitForWindows }
        } catch { Stop-Bootstrap 5 'Git installation' $_.Exception.Message 'Check the network connection and click Retry (installed tools are reused).' }
        Update-SessionPath
        $gitTool = Get-Tool 'git' @('--version')
        if (-not $gitTool -or -not $gitTool.Usable) { Stop-Bootstrap 5 'Git installation' 'Git is still not available after its installation.' 'Click Retry.' }
    }
}
if ($gitTool) { Write-Detail "Git $($gitTool.Version) at $($gitTool.Path)" }

# 3. The exact advertised ptbk version, globally for this user (a different version is never replaced silently).
Write-Step "Promptbook CLI ptbk $PromptbookVersion"
$spec = if ($PackageSpec) { $PackageSpec } else { "ptbk@$PromptbookVersion" }
if ($Plan) { Write-Detail "PLAN: npm install --global $spec" }
else {
    $installed = $null
    try {
        $listing = Invoke-Native { & $npm.Path ls --global ptbk --depth=0 --json 2>$null } | Out-String | ConvertFrom-Json
        if ($listing.dependencies -and $listing.dependencies.ptbk) { $installed = [string] $listing.dependencies.ptbk.version }
    } catch { $installed = $null }
    if ($installed -and $installed -ne $PromptbookVersion -and -not $AllowPtbkReplacement) {
        Stop-Bootstrap 3 'ptbk version' "ptbk $installed is installed globally; this installer provides ptbk $PromptbookVersion." "Confirm the replacement in the installer (or run it with -AllowPtbkReplacement). Project-local installations are never touched."
    }
    if ($installed -eq $PromptbookVersion) { Write-Detail "ptbk $installed is already installed (reused)." }
    else {
        Write-Detail "npm install --global $spec"
        Invoke-Native { & $npm.Path install --global $spec --no-fund --no-audit 2>&1 } | ForEach-Object { Write-Log "npm: $_" }
        if ($LASTEXITCODE -ne 0) { Stop-Bootstrap 5 'ptbk installation' "npm could not install $spec (see the diagnostics)." 'Check the network connection and click Retry.' }
    }
}
$prefix = if ($npm) { ([string] (Invoke-Native { & $npm.Path prefix --global })).Trim() } else { Join-Path $env:APPDATA 'npm' }
$ptbk = Join-Path $prefix 'ptbk.cmd'
if (-not $Plan) {
    if (-not (Test-Path -LiteralPath $ptbk)) { Stop-Bootstrap 5 'ptbk installation' "ptbk was not found at $ptbk after the installation." 'Click Retry.' }
    $reported = (Invoke-Native { & $ptbk --version 2>$null } | Out-String)
    if ($reported -notmatch [regex]::Escape($PromptbookVersion)) { Stop-Bootstrap 5 'ptbk verification' "$ptbk reports '$($reported.Trim())' instead of $PromptbookVersion." 'Click Retry.' }
    Write-Detail "Verified $ptbk ($PromptbookVersion)"
}

# 4. The projects folder: an ordinary container, never a project or Git repository itself.
Write-Step 'Projects folder'
$root = [System.IO.Path]::GetFullPath($ProjectsRoot)
if ($Plan) { Write-Detail "PLAN: use $root" }
else {
    try {
        New-Item -ItemType Directory -Force -Path $root | Out-Null
        $probe = Join-Path $root ('.ptbk-write-test-' + [guid]::NewGuid().ToString('N'))
        Set-Content -LiteralPath $probe -Value 'ok' -Encoding ASCII
        Remove-Item -LiteralPath $probe -Force
    } catch { Stop-Bootstrap 4 'Projects folder' "$root cannot be created or written: $($_.Exception.Message)" 'Choose another projects folder.' }
    Write-Detail $root
}

if ($SkipProject) {
    Write-Host ''
    Write-Host 'Promptbook is installed. No project was created.' -ForegroundColor Green
    Write-Host "To start one later: create an empty folder (for example in $root), open a terminal there and run: ptbk init"
    Write-Log 'Done: project skipped.'
    exit 2
}

# 5. One empty child folder for the first project (never overwriting or reinitializing existing content).
Write-Step 'First project folder'
if (-not (Test-ValidFolderName $ProjectName)) { Stop-Bootstrap 4 'Project name' "'$ProjectName' is not a valid Windows folder name." 'Choose another name (no \ / : * ? " < > | and no reserved names).' }
$target = Join-Path $root $ProjectName
if ([System.IO.Path]::GetFullPath($target) -notlike ([System.IO.Path]::GetFullPath($root).TrimEnd('\') + '\*')) { Stop-Bootstrap 4 'Project name' "'$ProjectName' points outside $root." 'Choose a plain folder name.' }
if (Test-Path -LiteralPath $target) {
    if (Get-ChildItem -LiteralPath $target -Force | Select-Object -First 1) {
        Stop-Bootstrap 4 'Project folder' "$target already exists and is not empty; nothing in it was changed." 'Choose another project name. (To continue a started setup there, open a terminal in it and run ptbk init.)'
    }
    Write-Detail "Reusing the existing empty folder $target"
} elseif ($Plan) { Write-Detail "PLAN: create $target" }
else {
    New-Item -ItemType Directory -Path $target | Out-Null
    Write-Detail "Created $target"
}

# 6. Hand off to the ordinary interactive initializer in a visible terminal that stays open.
Write-Step 'Opening the setup assistant (ptbk init)'
$display = "ptbk init --path ""$target"""
$command = "Set-Location -LiteralPath $(ConvertTo-PowerShellLiteral $target); Write-Host '> $($display.Replace("'", "''"))'; & $(ConvertTo-PowerShellLiteral $ptbk) init --path $(ConvertTo-PowerShellLiteral $target)"
if ($Plan -or $NoLaunch) {
    Write-Detail "Handoff command: $display"
    Write-Log "Handoff prepared (not launched): $command"
    exit 0
}
try {
    $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($command))
    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-NoProfile', '-EncodedCommand', $encoded) -WorkingDirectory $target | Out-Null
} catch {
    Stop-Bootstrap 6 'Terminal handoff' "The terminal could not be opened: $($_.Exception.Message)" "Open a terminal in ""$target"" and run: ""$ptbk"" init --path ""$target"""
}
Write-Host ''
Write-Host 'Done. The setup assistant is running in the new terminal window.' -ForegroundColor Green
Write-Host "Project folder: $target"
Write-Log 'Done: handed off to ptbk init.'
exit 0
