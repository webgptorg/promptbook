# Generate Inno Setup's Windows-native artwork from the repository's existing logo.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$logo = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot '..\..\design\logo-blue-transparent-1024.png'))
try {
    foreach ($item in @(@('wizard.bmp', 164, 314, 120), @('wizard-small.bmp', 55, 55, 48))) {
        $bitmap = New-Object System.Drawing.Bitmap([int]$item[1], [int]$item[2])
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.DrawImage($logo, [int](($item[1] - $item[3]) / 2), [int](($item[2] - $item[3]) / 2), [int]$item[3], [int]$item[3])
            $bitmap.Save((Join-Path $PSScriptRoot $item[0]), [System.Drawing.Imaging.ImageFormat]::Bmp)
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
    }
} finally { $logo.Dispose() }
# The multi-resolution icon is encoded to keep this source portable through text-only repository clients.
[System.IO.File]::WriteAllBytes((Join-Path $PSScriptRoot 'promptbook.ico'), [Convert]::FromBase64String((Get-Content (Join-Path $PSScriptRoot 'promptbook.ico.base64') -Raw)))
