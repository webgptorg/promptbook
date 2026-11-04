# Exercise the actual bootstrap helpers without installing a CLI or touching the user's persistent PATH.
param(
    [Parameter(Mandatory = $true)][string] $Bootstrap,
    [Parameter(Mandatory = $true)][string] $WorkDirectory,
    [ValidateSet('downloads', 'archive', 'reuse', 'live-node', 'permissions', 'shim', 'shortcuts')][string] $Mode,
    [string] $NodePath,
    [switch] $ReadOnlyShim
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-StrictMode -Version 2
# An isolated PATH/profile must not leave Windows PowerShell 5.1's script-based Get-FileHash export undiscovered.
# Load the shell's own utility module before importing bootstrap helpers and overriding download commands.
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Bootstrap, [ref] $tokens, [ref] $parseErrors)
if ($parseErrors) { throw ($parseErrors | Out-String) }
foreach ($definition in $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    . ([scriptblock]::Create($definition.Extent.Text))
}
$script:LogFile = Join-Path $WorkDirectory 'functions.log'
$IsolatedPath = $false

if ($Mode -eq 'shortcuts') {
    $script:LogDirectory = Join-Path $WorkDirectory 'installer'
    [IO.Directory]::CreateDirectory($script:LogDirectory) | Out-Null
    $programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs, [Environment+SpecialFolderOption]::DoNotVerify)
    if (-not $programs -or -not $programs.StartsWith($WorkDirectory, [StringComparison]::OrdinalIgnoreCase)) { throw "The fixture must own its known folder: $programs" }
    if ([IO.Directory]::Exists($programs)) { throw 'The fixture must begin without a Start menu Programs directory.' }
    $prefix = Join-Path $WorkDirectory 'npm'
    $ptbk = Join-Path $prefix 'ptbk.cmd'
    $shell = New-Object -ComObject WScript.Shell
    foreach ($attempt in 1..2) {
        Install-PtbkStartMenuShortcuts $NodePath $prefix $ptbk
        $menu = Join-Path $programs 'Promptbook'
        if (@(Get-ChildItem -LiteralPath $menu).Count -ne 2) { throw 'Repeated setup must keep exactly two CLI shortcuts.' }
        foreach ($name in @('Promptbook terminal', 'ptbk')) {
            $shortcut = $shell.CreateShortcut((Join-Path $menu ($name + '.lnk')))
            if ($shortcut.TargetPath -ne (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe')) { throw 'The shortcut must launch Windows PowerShell.' }
            if ($shortcut.WorkingDirectory -ne $env:USERPROFILE) { throw 'The shortcut must keep the literal user home.' }
            if ($shortcut.Arguments -notlike '*launch.ps1"') { throw 'The shortcut must use the prepared launcher.' }
        }
    }
    $launcher = Get-Content -LiteralPath (Join-Path $script:LogDirectory 'launch.ps1') -Raw
    if (-not $launcher.Contains((ConvertTo-PowerShellLiteral $ptbk))) { throw 'The launcher must invoke the verified CLI through a literal path.' }
    Write-Output 'Fresh profile Start menu shortcuts created and reused'
    exit 0
}

if ($Mode -eq 'shim') {
    $env:PATH = (Split-Path $NodePath) + [IO.Path]::PathSeparator + $env:PATH
    $cli = Join-Path $WorkDirectory 'node_modules\ptbk\bin\ptbk.js'
    [IO.Directory]::CreateDirectory((Split-Path $cli)) | Out-Null
    [IO.File]::WriteAllText($cli, "console.log('0.0.0-test');")
    $shim = Join-Path $WorkDirectory 'ptbk.cmd'
    # The actual npm cmd-shim template, including the unquoted assignment that broke ampersand paths.
    $source = @'
@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0
IF EXIST "%dp0%\node.exe" (
  SET "_prog=%dp0%\node.exe"
) ELSE (
  SET "_prog=node"
)
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" "%dp0%\node_modules\ptbk\bin\ptbk.js" %*
'@
    [IO.File]::WriteAllText($shim, $source)
    if ($ReadOnlyShim) { [IO.File]::SetAttributes($shim, [IO.FileAttributes]::ReadOnly) }
    try {
    Repair-PtbkCommandShim $shim
    $repaired = [IO.File]::ReadAllText($shim)
    foreach ($attempt in 1..2) {
        $output = @(Invoke-Native { & $shim --version 2>&1 }) -join [Environment]::NewLine
        if ($LASTEXITCODE -ne 0 -or $output.Trim() -ne '0.0.0-test') { throw "The npm launcher changed its literal path: $output" }
        Repair-PtbkCommandShim $shim
        if ([IO.File]::ReadAllText($shim) -ne $repaired) { throw 'Launcher repair must be idempotent.' }
    }
    } finally {
        if ($ReadOnlyShim) { [IO.File]::SetAttributes($shim, [IO.FileAttributes]::Normal) }
    }
    if ($ReadOnlyShim -and [IO.File]::ReadAllText($shim) -ne $source) { throw 'A working read-only launcher was changed.' }
    [IO.File]::WriteAllText($shim, "@echo off")
    Repair-PtbkCommandShim $shim
    if ([IO.File]::ReadAllText($shim) -ne '@echo off') { throw 'A custom launcher was replaced.' }
    Write-Output 'Npm launcher literal paths and custom launcher preservation verified'
    exit 0
}


if ($Mode -eq 'permissions') {
    # Resolve this shell's own security module explicitly under the fixture's isolated PATH/profile.
    Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
    $root = Join-Path $WorkDirectory 'write-denied'
    [IO.Directory]::CreateDirectory($root) | Out-Null
    $originalAcl = Get-Acl -LiteralPath $root
    $acl = Get-Acl -LiteralPath $root
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $deny = New-Object Security.AccessControl.FileSystemAccessRule($identity, [Security.AccessControl.FileSystemRights]::Write, [Security.AccessControl.AccessControlType]::Deny)
    $acl.AddAccessRule($deny)
    $result = Join-Path $WorkDirectory 'permission-result.ini'
    try {
        Set-Acl -LiteralPath $root -AclObject $acl
        $shell = (Get-Process -Id $PID).Path
        & $shell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $Bootstrap -PromptbookVersion '0.0.0-test' -ProjectsRoot $root -ValidateProjectsOnly -ResultFile $result
        if ($LASTEXITCODE -ne 4) { throw "A denied write must be a project-folder failure, got $LASTEXITCODE." }
        $global:LASTEXITCODE = 0
    } finally {
        Set-Acl -LiteralPath $root -AclObject $originalAcl
    }
    if (Get-ChildItem -LiteralPath $root -Force) { throw 'A denied write left project or probe files behind.' }
    if (-not (Test-Path -LiteralPath $result)) { throw 'A denied write lost the installer result.' }
    Write-Output 'Denied folder writes produce actionable diagnostics without changing permissions or user content.'
    exit 0
}

if ($Mode -eq 'archive') {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $script:ArchiveName = 'node-v22.13.0-win-x64.zip'
    $script:ArchiveFixture = Join-Path $WorkDirectory $script:ArchiveName
    $source = Join-Path $WorkDirectory 'source'
    $runtimeName = [IO.Path]::GetFileNameWithoutExtension($script:ArchiveName)
    $payload = Join-Path $source $runtimeName
    [IO.Directory]::CreateDirectory($payload) | Out-Null
    [IO.File]::WriteAllText((Join-Path $payload 'node.exe'), 'fixture executable')
    [IO.File]::WriteAllText((Join-Path $payload 'npm.cmd'), 'fixture npm')
    [IO.Compression.ZipFile]::CreateFromDirectory($source, $script:ArchiveFixture)
    $script:ArchiveHash = (Get-FileHash -LiteralPath $script:ArchiveFixture -Algorithm SHA256).Hash
    $script:SelectedRuntime = ''
    function Invoke-WebRequest([switch] $UseBasicParsing, [string] $Uri, [string] $OutFile, [int] $TimeoutSec) {
        if (-not $OutFile) { return @{ Content = $script:ArchiveHash + '  ' + $script:ArchiveName } }
        [IO.File]::Copy($script:ArchiveFixture, $OutFile, $true)
    }
    function Add-UserPath([string] $Directory) { $script:SelectedRuntime = $Directory }
    Install-NodeFromNodejsOrg
    $first = $script:SelectedRuntime
    $sentinel = Join-Path $first 'keep.txt'
    [IO.File]::WriteAllText($sentinel, 'preserved')
    Install-NodeFromNodejsOrg
    if ($script:SelectedRuntime -eq $first) { throw 'An existing runtime must not be overwritten during repair.' }
    if ([IO.File]::ReadAllText($sentinel) -ne 'preserved') { throw 'Existing runtime content was changed.' }
    if (-not (Test-Path -LiteralPath (Join-Path $script:SelectedRuntime 'npm.cmd'))) { throw 'The archive was not extracted.' }
    if (Get-ChildItem -LiteralPath (Split-Path $first) -Directory -Force | Where-Object { $_.Name.StartsWith('.extract-') }) { throw 'An extraction directory was left behind.' }
    Write-Output 'Literal-path extraction and repair verified'
    exit 0
}

if ($Mode -eq 'downloads') {
    $script:Requests = 0
    $script:LastDownload = ''
    function Invoke-WebRequest([switch] $UseBasicParsing, [string] $Uri, [string] $OutFile, [int] $TimeoutSec) {
        $script:Requests++
        $script:LastDownload = $OutFile
        if ($script:Requests -eq 1) { throw 'Transient fixture connection error' }
        [IO.File]::WriteAllText($OutFile, 'verified fixture payload')
    }
    function Start-Sleep([int] $Seconds) { }
    $payload = Join-Path $WorkDirectory 'payload.txt'
    [IO.File]::WriteAllText($payload, 'verified fixture payload')
    $hash = (Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash
    $download = Get-VerifiedDownload 'https://example.invalid/runtime.zip' $hash 'runtime.zip'
    if ($script:Requests -ne 2 -or -not (Test-Path -LiteralPath $download)) { throw 'The transient download was not retried.' }
    $refused = $false
    try { Get-VerifiedDownload 'https://example.invalid/runtime.zip' ('0' * 64) 'runtime.zip' | Out-Null }
    catch { $refused = $_.Exception.Message -match 'SHA-256 verification' }
    if (-not $refused -or (Test-Path -LiteralPath $script:LastDownload)) { throw 'Corrupt content must be refused and removed.' }
    Write-Output 'Retry and checksum verified'
    exit 0
}

if ($Mode -eq 'live-node') {
    # Clean-machine coverage: download the official runtime without relying on the runner's Node/npm.
    # All installation files are private to the fixture; registry PATH writes are disabled.
    $env:LOCALAPPDATA = Join-Path $WorkDirectory 'local'
    $env:Path = "$env:SystemRoot\System32;$env:SystemRoot;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
    function Add-UserPath([string] $Directory) { }
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    Install-NodeFromNodejsOrg
    # Simulate restarting setup from its original environment, before the PATH broadcast has arrived.
    $env:Path = "$env:SystemRoot\System32;$env:SystemRoot;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
}

$runtime = Get-NodeRuntime
if (-not $runtime.Ready) { throw 'The private Node/npm runtime was not usable.' }
$expectedRoot = Join-Path $env:LOCALAPPDATA 'Promptbook\runtime'
if (-not $runtime.Node.Path.StartsWith($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'The private runtime was not selected.' }
Write-Output 'Private runtime reused'
