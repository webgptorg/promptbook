<#
.SYNOPSIS
    Promptbook Windows bootstrap: prepares Node.js, npm and Git, installs the exact released ptbk version globally,
    prepares an empty first-project folder and opens a terminal that runs the ordinary interactive `ptbk init` there.

.DESCRIPTION
    A thin onboarding layer, not a second engine or initializer: project setup, tools, login, Git and the background
    start all stay with `ptbk init`. Existing compatible prerequisites are reused; missing or incompatible Node.js is prepared privately from
    official distributions. Nothing is silently replaced or downgraded. Re-running is safe: satisfied steps are reused,
    a nonempty folder is never treated as a new empty project, and PATH entries are not duplicated.

    Exit codes: 0 handed off (or prepared with -NoLaunch); 2 CLI installed, project skipped; 3 a decision is needed
    (a different installed ptbk version); 4 project folder problem; 5 download or
    installation failure; 6 terminal handoff failure.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $PromptbookVersion,
    [string] $ProjectsRoot = (Join-Path (Join-Path $env:USERPROFILE 'ptbk') 'project'),
    [string] $ProjectName = 'my-first-project',
    [switch] $SkipProject,
    [switch] $AllowPtbkReplacement,
    [switch] $Plan,
    [switch] $NoLaunch,
    [string] $DesktopPath,
    [switch] $DetectOnly,
    [string] $DetectionFile,
    [string] $ResultFile,
    [string] $PackageSpec,
    # Validation only: see exactly the current process PATH (simulates a machine without the runner's tools).
    [switch] $IsolatedPath
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# Windows PowerShell can otherwise negotiate legacy TLS on clean/older Windows installations.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Set-StrictMode -Version 2
# Windows PowerShell 5.1 reads this file as ANSI unless it has a BOM: it is kept pure ASCII on purpose.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { Write-Verbose 'The console encoding cannot be changed (no console attached).' }

$script:LogDirectory = Join-Path $env:LOCALAPPDATA 'Promptbook\installer'
New-Item -ItemType Directory -Force -Path $script:LogDirectory | Out-Null
$script:LogFile = Join-Path $script:LogDirectory ("bootstrap-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$script:Step = 0
$script:Total = if ($SkipProject) { 4 } else { 6 }
$script:CurrentStage = 'Starting preparation'

# Native programs may write progress to stderr; in Windows PowerShell 5.1 that must not become a terminating error.
function Invoke-Native([scriptblock] $Block) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Block } finally { $ErrorActionPreference = $previous }
}

function Write-Log([string] $Text) {
    Add-Content -LiteralPath $script:LogFile -Value ("{0} {1}" -f (Get-Date -Format o), $Text) -Encoding UTF8
}

# UTF-16 INI results remain readable by Inno Setup when paths/errors contain Unicode.
function Write-InstallerData([string] $Path, [string] $Section, [hashtable] $Values) {
    if (-not $Path) { return }
    $lines = @("[$Section]")
    foreach ($key in ($Values.Keys | Sort-Object)) {
        $value = ([string] $Values[$key]) -replace '[\r\n\x00]', ' '
        $lines += "$key=$value"
    }
    Set-Content -LiteralPath $Path -Value $lines -Encoding Unicode
}

function Write-InstallerResult([int] $Code, [string] $Stage, [string] $Message, [string] $NextAction) {
    Write-InstallerData $ResultFile 'Result' @{ Code = $Code; Stage = $Stage; Message = $Message; NextAction = $NextAction; LogFile = $script:LogFile }
}

function Write-Step([string] $Text) {
    $script:CurrentStage = $Text
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
    Write-InstallerResult $Code $Stage $Message $NextAction
    exit $Code
}

# The executables this process can use: its current PATH first (tools the launching environment already selected),
# then the machine and user PATH from the registry (prerequisites installed meanwhile), plus npm's per-user global bin.
# Nothing is written to the persistent PATH here.
function Update-SessionPath {
    if ($IsolatedPath) { return }
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = New-Object System.Collections.Generic.List[string]
    $separator = [System.IO.Path]::PathSeparator
    foreach ($part in (@($env:PATH, $machine, $user, (Join-Path $env:APPDATA 'npm')) -join $separator).Split($separator)) {
        if ($part -and -not $entries.Contains($part)) { $entries.Add($part) }
    }
    $env:PATH = $entries -join $separator
}

function Get-Tool([string] $Command, [string[]] $Arguments) {
    $found = Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) { return $null }
    $unusable = @{ Path = $found.Source; Version = $null; Usable = $false }
    try {
        # The whole output is collected first: stopping the pipeline early (Select-Object -First) would end the
        # program before its exit code is recorded, and a working tool would look broken.
        $global:LASTEXITCODE = 0
        $lines = @(Invoke-Native { & $found.Source @Arguments 2>$null })
        $code = $global:LASTEXITCODE
    } catch {
        Write-Log "PROBE $($found.Source) $Arguments failed: $($_.Exception.Message)"
        return $unusable
    }
    $output = [string] ($lines | Where-Object { $_ } | Select-Object -First 1)
    Write-Log "PROBE $($found.Source) $Arguments -> exit $code, '$output'"
    if ($code -ne 0 -or -not $output) { return $unusable }
    $match = [regex]::Match($output, '(\d+)\.(\d+)\.(\d+)')
    if (-not $match.Success) { return $unusable }
    return @{ Path = $found.Source; Version = [version] ("{0}.{1}.{2}" -f $match.Groups[1].Value, $match.Groups[2].Value, $match.Groups[3].Value); Usable = $true }
}

# ptbk requires Node.js ^22.13.0 || >=24 and npm >= 10 (package.json "engines").
function Test-NodeCompatible([version] $Version) {
    return ($Version.Major -eq 22 -and $Version -ge [version] '22.13.0') -or ($Version.Major -ge 24)
}

# Reuse a compatible Node/npm pair, including a private runtime installed by an earlier attempt
# when the installer was started from a stale PATH. Probes never change persistent settings.
function Get-NodeRuntime {
    $originalPath = $env:PATH
    $node = Get-Tool 'node' @('--version')
    $npm = Get-Tool 'npm.cmd' @('--version')
    $candidates = @(Get-Command node -CommandType Application -All -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'Promptbook\runtime'
    if (-not $IsolatedPath -and (Test-Path -LiteralPath $runtimeRoot -PathType Container)) {
        $candidates += @(Get-ChildItem -LiteralPath $runtimeRoot -Directory | ForEach-Object { Join-Path $_.FullName 'node.exe' })
    }
    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $candidateNode = Get-Tool $candidate @('--version')
        if (-not $candidateNode -or -not $candidateNode.Usable -or -not (Test-NodeCompatible $candidateNode.Version)) { continue }
        $env:PATH = (Split-Path $candidate) + [System.IO.Path]::PathSeparator + $originalPath
        $candidateNpm = Get-Tool 'npm.cmd' @('--version')
        if ($candidateNpm -and $candidateNpm.Usable -and $candidateNpm.Version.Major -ge 10) {
            return @{ Node = $candidateNode; Npm = $candidateNpm; Ready = $true }
        }
    }
    $env:PATH = $originalPath
    return @{ Node = $node; Npm = $npm; Ready = $false }
}

function Install-WithWinget([string] $Id, [string] $Name) {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) { return $false }
    Write-Detail "Installing $Name with winget (official package $Id)..."
    Invoke-Native { & $winget.Source install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements 2>&1 } | ForEach-Object { Write-Log "winget: $_" }
    return ($LASTEXITCODE -eq 0)
}

function Get-VerifiedDownload([string] $Url, [string] $ExpectedSha256, [string] $FileName) {
    $directory = Join-Path $env:TEMP ('ptbk-download-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $target = Join-Path $directory $FileName
    Write-Log "Download source: $Url"
    foreach ($attempt in 1..3) {
        Write-Detail "Downloading $FileName (attempt $attempt of 3)..."
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $target -TimeoutSec 300
            break
        } catch {
            Write-Log "Download attempt $attempt failed: $($_.Exception.Message)"
            if ($attempt -eq 3) { throw }
            Start-Sleep -Seconds $attempt
        }
    }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash.ToLowerInvariant()
    if ($actual -ne $ExpectedSha256.ToLowerInvariant()) {
        Remove-Item -LiteralPath $target -Force
        throw "The download of $FileName failed its SHA-256 verification."
    }
    return $target
}

# Keep existing Node installations intact; use a verified per-user runtime when needed.
function Install-NodeFromNodejsOrg {
    $base = 'https://nodejs.org/dist/latest-v22.x/'
    $sums = (Invoke-WebRequest -UseBasicParsing -Uri ($base + 'SHASUMS256.txt')).Content
    $line = ($sums -split "`n") | Where-Object { $_ -match 'node-v22\.\d+\.\d+-win-x64\.zip$' } | Select-Object -First 1
    if (-not $line) { throw 'The Node.js release index has no Windows x64 archive.' }
    $parts = $line.Trim() -split '\s+'
    $archive = Get-VerifiedDownload ($base + $parts[1]) $parts[0] $parts[1]
    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'Promptbook\runtime'
    [System.IO.Directory]::CreateDirectory($runtimeRoot) | Out-Null
    $staging = Join-Path $runtimeRoot ('.extract-' + [guid]::NewGuid().ToString('N'))
    $runtimeName = [System.IO.Path]::GetFileNameWithoutExtension($parts[1])
    $runtime = Join-Path $runtimeRoot $runtimeName
    # Preserve a previous incomplete runtime until its replacement has been extracted and verified.
    if (Test-Path -LiteralPath $runtime) { $runtime += '-' + [guid]::NewGuid().ToString('N') }
    Write-Detail 'Unpacking the verified Node.js runtime...'
    try {
        # Expand-Archive treats brackets in its destination as wildcards, even with -LiteralPath
        # on the source. ZipFile uses literal Unicode paths on Windows PowerShell 5.1 as well.
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($archive, $staging)
        $extracted = Join-Path $staging $runtimeName
        foreach ($required in @('node.exe', 'npm.cmd')) {
            if (-not (Test-Path -LiteralPath (Join-Path $extracted $required) -PathType Leaf)) { throw "The Node.js archive is missing $required." }
        }
        [System.IO.Directory]::Move($extracted, $runtime)
    } finally {
        if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
        Remove-Item -LiteralPath $archive -Force
    }
    $env:PATH = $runtime + [System.IO.Path]::PathSeparator + $env:PATH
    Add-UserPath $runtime
}

# Persist each required command directory once, without replacing the user's other tools.
function Add-UserPath([string] $Directory) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($Directory -notin ($userPath -split ';')) {
        [Environment]::SetEnvironmentVariable('Path', ($Directory + ';' + $userPath), 'User')
    }
}

function Install-GitFromGitForWindows {
    # The official Git for Windows installer, verified against the checksum table of its GitHub release.
    $release = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{ 'User-Agent' = 'promptbook-installer' }
    $asset = $release.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1
    if (-not $asset) { throw 'The Git for Windows release has no 64-bit installer.' }
    $match = [regex]::Match([string] $release.body, [regex]::Escape($asset.name) + '\s*\|\s*([0-9a-fA-F]{64})')
    if (-not $match.Success) { throw 'The Git for Windows release does not publish a checksum for its installer.' }
    $installer = Get-VerifiedDownload $asset.browser_download_url $match.Groups[1].Value $asset.name
    Write-Detail 'Installing Git (Windows may ask for permission)...'
    $process = Start-Process -FilePath $installer -ArgumentList @('/VERYSILENT', '/NORESTART', '/SP-', '/SUPPRESSMSGBOXES') -WindowStyle Hidden -Wait -PassThru
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

# Preserve unexpected PowerShell/.NET failures as actionable installer results, too.
trap {
    Write-Log "Unexpected error at line $($_.InvocationInfo.ScriptLineNumber): $($_.Exception.Message)"
    Stop-Bootstrap 5 $script:CurrentStage $_.Exception.Message 'Review the diagnostics and click Retry.'
}

Update-SessionPath
if ($DetectOnly) {
    $script:CurrentStage = 'Checking required software'
    if (-not $DetectionFile) { throw 'Detection requires -DetectionFile.' }
    $runtime = Get-NodeRuntime
    $gitTool = Get-Tool 'git' @('--version')
    Write-InstallerData $DetectionFile 'Prerequisites' @{
        NodeReady = [int] $runtime.Ready
        NodeVersion = if ($runtime.Node) { [string] $runtime.Node.Version } else { '' }
        NpmVersion = if ($runtime.Npm) { [string] $runtime.Npm.Version } else { '' }
        GitReady = [int] [bool] ($gitTool -and $gitTool.Usable)
        GitVersion = if ($gitTool) { [string] $gitTool.Version } else { '' }
        GitNeedsRepair = [int] [bool] ($gitTool -and -not $gitTool.Usable)
    }
    Write-InstallerResult 0 'Checking required software' 'Required software checked.' ''
    exit 0
}

Write-Log "Promptbook bootstrap for ptbk $PromptbookVersion (plan: $Plan, skip project: $SkipProject)"
Write-Host "Promptbook $PromptbookVersion - preparing your computer" -ForegroundColor White
Write-Host 'This installs what ptbk needs, then opens the setup assistant (ptbk init) in a terminal.'
Write-Host ''

# 1. Reuse compatible Node and npm, otherwise prepare a private runtime.
Write-Step 'Node.js and npm'
$runtime = Get-NodeRuntime
$node = $runtime.Node
$npm = $runtime.Npm
if (-not $runtime.Ready) {
    if ($Plan) { Write-Detail 'PLAN: prepare a verified per-user Node.js 22 runtime including npm; existing Node.js stays unchanged.' }
    else {
        try { Install-NodeFromNodejsOrg } catch { Stop-Bootstrap 5 'Node.js installation' $_.Exception.Message 'Check the network connection and click Retry.' }
        $node = Get-Tool 'node' @('--version')
        $npm = Get-Tool 'npm.cmd' @('--version')
        if (-not $node -or -not $node.Usable -or -not (Test-NodeCompatible $node.Version) -or -not $npm -or -not $npm.Usable -or $npm.Version.Major -lt 10) {
            Stop-Bootstrap 5 'Node.js installation' 'The prepared Node.js and npm could not be verified.' 'Click Retry.'
        }
    }
}
if ($node) { Write-Detail "Node.js $($node.Version) at $($node.Path)" }
if ($npm) { Write-Detail "npm $($npm.Version)" }

# 2. Git (reused when present; the installer never configures a Git identity or requires a GitHub account).
Write-Step 'Git'
$gitTool = Get-Tool 'git' @('--version')
if ($gitTool -and -not $gitTool.Usable) { Stop-Bootstrap 5 'Git verification' "Git at $($gitTool.Path) does not run." 'Repair or reinstall Git, then click Retry.' }
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
    Add-UserPath $prefix
    $launcher = Join-Path $script:LogDirectory 'launch.ps1'
    $launchLines = @(
        ('$env:PATH = ' + (ConvertTo-PowerShellLiteral ((Split-Path $node.Path) + ';' + $prefix + ';')) + ' + $env:PATH'),
        'Set-Location -LiteralPath $env:USERPROFILE',
        ('& ' + (ConvertTo-PowerShellLiteral $ptbk))
    )
    Set-Content -LiteralPath $launcher -Value $launchLines -Encoding UTF8
    $shell = New-Object -ComObject WScript.Shell
    $menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Promptbook'
    New-Item -ItemType Directory -Force -Path $menu | Out-Null
    foreach ($name in @('Promptbook terminal', 'ptbk')) {
        $shortcut = $shell.CreateShortcut((Join-Path $menu ($name + '.lnk')))
        $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $shortcut.Arguments = '-NoExit -NoProfile -ExecutionPolicy Bypass -File "' + $launcher + '"'
        $shortcut.WorkingDirectory = $env:USERPROFILE
        $shortcut.IconLocation = (Join-Path $script:LogDirectory 'promptbook.ico')
        $shortcut.Save()
    }

}

# The desktop is a separate client of this verified system Node/CLI, never an embedded engine.
if ($DesktopPath) {
    if ($Plan) { Write-Detail "PLAN: configure the desktop client at $DesktopPath" }
    else {
        if (-not (Test-Path -LiteralPath $DesktopPath -PathType Leaf)) { Stop-Bootstrap 5 'Desktop installation' "The selected desktop executable is missing: $DesktopPath" 'Retry the installer with the desktop component selected.' }
        $globalModules = ([string] (Invoke-Native { & $npm.Path root --global })).Trim()
        $installation = Join-Path $globalModules 'ptbk'
        if (-not (Test-Path -LiteralPath (Join-Path $installation 'bin\ptbk.js'))) { Stop-Bootstrap 5 'Desktop runtime' 'The verified CLI installation could not be located.' 'Retry the installer.' }
        $desktopDirectory = Join-Path $env:LOCALAPPDATA 'Promptbook\desktop'
        New-Item -ItemType Directory -Force -Path $desktopDirectory | Out-Null
        @{ installation = $installation; nodePath = $node.Path; env = @{ Path = $env:PATH } } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $desktopDirectory 'runtime.json') -Encoding UTF8
    }
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
    if ($DesktopPath -and -not $Plan -and -not $NoLaunch) {
        try { Start-Process -FilePath $DesktopPath -ArgumentList @('--skip-init') | Out-Null }
        catch { Stop-Bootstrap 6 'Desktop handoff' $_.Exception.Message 'Open Promptbook from the Start menu, or retry.' }
    }
    Write-Host ''
    Write-Host 'Promptbook is installed. No project was created.' -ForegroundColor Green
    Write-Host "To start one later: create an empty folder (for example in $root), open a terminal there and run: ptbk init"
    Write-Log 'Done: project skipped.'
    Write-InstallerResult 2 'Complete' 'Promptbook is installed. No project was created.' ''
    exit 2
}

# 5. One empty child folder for the first project (never overwriting or reinitializing existing content).
Write-Step 'First project folder'
if (-not (Test-ValidFolderName $ProjectName)) { Stop-Bootstrap 4 'Project name' "'$ProjectName' is not a valid Windows folder name." 'Choose another name (no \ / : * ? " < > | and no reserved names).' }
$target = Join-Path $root $ProjectName
# A plain prefix comparison: -like would treat [ and ] in folder names as wildcards.
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not [System.IO.Path]::GetFullPath($target).StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) { Stop-Bootstrap 4 'Project name' "'$ProjectName' points outside $root." 'Choose a plain folder name.' }
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
if ($DesktopPath) {
    Write-Step 'Opening the Promptbook desktop setup assistant'
    if ($Plan -or $NoLaunch) { Write-Detail "Desktop handoff prepared (not launched): $DesktopPath --init `"$target`""; Write-InstallerResult 0 'Complete' 'Desktop handoff prepared.' ''; exit 0 }
    try { Start-Process -FilePath $DesktopPath -ArgumentList @('--init', ('"' + $target + '"')) -WorkingDirectory $target | Out-Null }
    catch { Stop-Bootstrap 6 'Desktop handoff' $_.Exception.Message 'Open Promptbook from the Start menu, or retry.' }
    Write-Host 'Done. Promptbook is opening the same initializer in the desktop application.' -ForegroundColor Green
    Write-InstallerResult 0 'Complete' 'Promptbook is opening the setup assistant.' ''
    exit 0
}
Write-Step 'Opening the setup assistant (ptbk init)'
$display = "ptbk init --path ""$target"""
$command = "Set-Location -LiteralPath $(ConvertTo-PowerShellLiteral $target); Write-Host '> $($display.Replace("'", "''"))'; & $(ConvertTo-PowerShellLiteral $ptbk) init --path $(ConvertTo-PowerShellLiteral $target)"
if ($Plan -or $NoLaunch) {
    Write-Detail "Handoff command: $display"
    Write-Log "Handoff prepared (not launched): $command"
    Write-InstallerResult 0 'Complete' 'CLI handoff prepared.' ''
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
Write-InstallerResult 0 'Complete' 'The setup assistant is running in the new terminal window.' ''
exit 0
