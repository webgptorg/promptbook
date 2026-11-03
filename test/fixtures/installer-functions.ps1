# Exercise the actual bootstrap helpers without installing a CLI or touching the user's persistent PATH.
param(
    [Parameter(Mandatory = $true)][string] $Bootstrap,
    [Parameter(Mandatory = $true)][string] $WorkDirectory,
    [ValidateSet('downloads', 'archive', 'reuse', 'live-node')][string] $Mode
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
