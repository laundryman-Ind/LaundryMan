# Generate Android launcher icons from frontend/public/logo.png
Add-Type -AssemblyName System.Drawing

$logoPath = Join-Path $PSScriptRoot "..\public\logo.png"
$resDir   = Join-Path $PSScriptRoot "..\android\app\src\main\res"

$src = New-Object System.Drawing.Bitmap($logoPath)

# Find the non-transparent bounding box of the logo content
$minX = $src.Width; $minY = $src.Height; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $src.Height; $y += 2) {
  for ($x = 0; $x -lt $src.Width; $x += 2) {
    $p = $src.GetPixel($x, $y)
    if ($p.A -gt 8) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
Write-Host "Logo content bbox: $contentW x $contentH (origin $minX,$minY)"

function Make-Icon([string]$dir, [int]$size, [bool]$transparentBg, [double]$fill) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  if ($transparentBg) {
    $g.Clear([System.Drawing.Color]::Transparent)
  } else {
    $g.Clear([System.Drawing.Color]::White)
  }

  $scale = ($size * $fill) / [Math]::Max($contentW, $contentH)
  $drawW = [int]($contentW * $scale)
  $drawH = [int]($contentH * $scale)
  $drawX = [int](($size - $drawW) / 2)
  $drawY = [int](($size - $drawH) / 2)

  $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $contentW, $contentH)
  $dstRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $outPath = Join-Path $resDir "$dir\ic_launcher.png"
  if ($dir -match "foreground") { $outPath = Join-Path $resDir ($dir -replace "_foreground", "\ic_launcher_foreground.png") }
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $outPath ($size px)"
}

# Legacy + round icons: logo on white, 84% fill
$legacy = @{
  "mipmap-mdpi"    = 48
  "mipmap-hdpi"    = 72
  "mipmap-xhdpi"   = 96
  "mipmap-xxhdpi"  = 144
  "mipmap-xxxhdpi" = 192
}
foreach ($d in $legacy.GetEnumerator()) {
  Make-Icon $d.Key $d.Value $false 0.84
  Copy-Item (Join-Path $resDir "$($d.Key)\ic_launcher.png") (Join-Path $resDir "$($d.Key)\ic_launcher_round.png") -Force
}

# Adaptive foreground: transparent, logo at 60% (within safe zone)
$fg = @{
  "mipmap-mdpi"    = 108
  "mipmap-hdpi"    = 162
  "mipmap-xhdpi"   = 216
  "mipmap-xxhdpi"  = 324
  "mipmap-xxxhdpi" = 432
}
foreach ($d in $fg.GetEnumerator()) {
  Make-Icon "$($d.Key)_foreground" $d.Value $true 0.6
}

$src.Dispose()
Write-Host "All icons generated."
