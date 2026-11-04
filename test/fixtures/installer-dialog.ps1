# Exercise the compiled production failure dialog, actual Windows clipboard and decision results.
param(
    [Parameter(Mandatory = $true)][string] $Executable,
    [Parameter(Mandatory = $true)][string] $Bootstrap,
    [Parameter(Mandatory = $true)][string] $WorkDirectory
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class InstallerDialogNative {
    public delegate bool EnumProc(IntPtr h, IntPtr p);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
    public static IntPtr FindReportWindow() { return FindWindow(null, "Promptbook setup needs attention"); }
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr p);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc callback, IntPtr p);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder text, int capacity);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
}
'@

# No registry, package manager or persistent PATH changes: get an actual bootstrap failure before tool preparation.
[IO.Directory]::CreateDirectory($WorkDirectory) | Out-Null
$env:LOCALAPPDATA = Join-Path $WorkDirectory 'local'
$env:APPDATA = Join-Path $WorkDirectory 'roaming'
$env:USERPROFILE = Join-Path $WorkDirectory 'home'
[IO.Directory]::CreateDirectory($env:USERPROFILE) | Out-Null
[IO.File]::WriteAllText((Join-Path $env:USERPROFILE 'ptbk'), 'user file kept')
$resultFile = Join-Path $WorkDirectory 'result.ini'
& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $Bootstrap -PromptbookVersion '0.0.0-test' -ResultFile $resultFile -NoLaunch
if ($LASTEXITCODE -ne 4) { throw "Expected folder refusal before prerequisites, got $LASTEXITCODE" }
$global:LASTEXITCODE = 0

function Wait-Dialog {
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    do {
        $window = [InstallerDialogNative]::FindReportWindow()
        if ($window -ne [IntPtr]::Zero) { return $window }
        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)
    [InstallerDialogNative]::EnumWindows({
        param($handle, $unused)
        $text = New-Object Text.StringBuilder 4096
        [InstallerDialogNative]::GetWindowText($handle, $text, $text.Capacity) | Out-Null
        if ($text.Length -gt 0) { Write-Host ("Window: " + $text.ToString()) }
        return $true
    }, [IntPtr]::Zero) | Out-Null
    $setupLog = Join-Path $WorkDirectory 'setup.log'
    if (Test-Path -LiteralPath $setupLog) { Get-Content -LiteralPath $setupLog | Write-Host }
    throw 'The compiled installer did not show its report dialog.'
}

function Find-Button([IntPtr] $Window, [string] $Caption) {
    $script:Button = [IntPtr]::Zero
    [InstallerDialogNative]::EnumChildWindows($Window, {
        param($handle, $unused)
        $text = New-Object Text.StringBuilder 1024
        [InstallerDialogNative]::GetWindowText($handle, $text, $text.Capacity) | Out-Null
        if ($text.ToString().Replace('&', '') -eq $Caption) { $script:Button = $handle }
        return $true
    }, [IntPtr]::Zero) | Out-Null
    if ($script:Button -eq [IntPtr]::Zero) { throw "Missing '$Caption' button." }
    return $script:Button
}

function Click-Button([IntPtr] $Window, [string] $Caption) {
    $button = Find-Button $Window $Caption
    if (-not [InstallerDialogNative]::PostMessage($button, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)) { throw "Could not click $Caption." }
}

function Read-CopiedReport([IntPtr] $Window, [string] $Expected) {
    [Windows.Forms.Clipboard]::SetText('clipboard sentinel')
    Click-Button $Window 'Copy report'
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 100
        $text = [Windows.Forms.Clipboard]::GetText()
        if ($text.Contains($Expected)) {
            if ([InstallerDialogNative]::FindReportWindow() -eq [IntPtr]::Zero) { throw 'Copy report closed the dialog.' }
            if (-not $text.Contains('Version: 0.0.0-test')) { throw 'The copied report omitted the version.' }
            return $text
        }
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "The native clipboard did not receive the expected report: $text"
}

$process = Start-Process -FilePath $Executable -ArgumentList @('/SP-', ('/LOG="' + (Join-Path $WorkDirectory 'setup.log') + '"'), ('/FixtureRoot="' + $WorkDirectory + '"'), ('/Bootstrap="' + $Bootstrap + '"')) -WindowStyle Normal -PassThru
try {
    $window = Wait-Dialog
    $first = Read-CopiedReport $window 'Exit code: 4'
    if (-not $first.Contains($env:USERPROFILE)) { throw 'Unicode project context was lost in clipboard output.' }
    if (-not $first.Contains('PATH ')) { throw 'The copied report omitted bootstrap path diagnostics.' }
    [IO.File]::WriteAllText((Join-Path $WorkDirectory 'copied-report.txt'), $first)
    # Capture the actual dialog for visual review, including high-DPI control bounds on the runner.
    $screen = [Windows.Forms.SystemInformation]::VirtualScreen
    $bitmap = New-Object Drawing.Bitmap($screen.Width, $screen.Height)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.CopyFromScreen($screen.Left, $screen.Top, 0, 0, $bitmap.Size)
        $bitmap.Save((Join-Path $WorkDirectory 'report-dialog.png'), [Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
    Click-Button $window 'Choose folder...'
    Start-Sleep -Milliseconds 300
    $window = Wait-Dialog
    Read-CopiedReport $window 'Review the installed version' | Out-Null
    Click-Button $window 'Cancel'
    Start-Sleep -Milliseconds 300
    $window = Wait-Dialog
    Read-CopiedReport $window 'Windows PowerShell could not be started' | Out-Null
    Click-Button $window 'Retry'
    if (-not $process.WaitForExit(15000)) { throw 'The dialog fixture did not exit.' }
    $decisions = [IO.File]::ReadAllText((Join-Path $WorkDirectory 'decisions.txt'))
    if ($decisions -ne '6,2,1') { throw "Copy must not choose an action; expected choose/cancel/retry (6,2,1), got $decisions" }
    if ([IO.File]::ReadAllText((Join-Path $env:USERPROFILE 'ptbk')) -ne 'user file kept') { throw 'The fixture user file was changed.' }
    Write-Output 'Compiled report dialog, Unicode clipboard, folder choice, cancellation and retry verified.'
} finally {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
