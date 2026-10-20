# Crop a region of a book photo at full resolution (EXIF-rotated) for close reading.
# Usage: powershell -File tools/crop.ps1 -File IMG_2215.JPG -X0 0 -Y0 0 -X1 0.5 -Y1 0.5 -Out C:\path\crop.jpg [-Max 1600]
param(
  [Parameter(Mandatory)][string]$File,
  [double]$X0 = 0, [double]$Y0 = 0, [double]$X1 = 1, [double]$Y1 = 1,
  [Parameter(Mandatory)][string]$Out,
  [int]$Max = 1600
)
Add-Type -AssemblyName System.Drawing
if (-not [System.IO.Path]::IsPathRooted($File)) { $File = Join-Path "C:\Claude_Development\matematik-labirenti\kitap_gorselleri" $File }
$img = [System.Drawing.Image]::FromFile($File)
foreach ($p in $img.PropertyItems) { if ($p.Id -eq 0x0112) { $o = $p.Value[0]; if ($o -eq 6) { $img.RotateFlip('Rotate90FlipNone') } elseif ($o -eq 8) { $img.RotateFlip('Rotate270FlipNone') } elseif ($o -eq 3) { $img.RotateFlip('Rotate180FlipNone') } } }
$sx = [int]($img.Width * $X0); $sy = [int]($img.Height * $Y0)
$sw = [int]($img.Width * ($X1 - $X0)); $sh = [int]($img.Height * ($Y1 - $Y0))
$scale = [Math]::Min(1.0, $Max / [Math]::Max($sw, $sh))
$w = [int]($sw * $scale); $h = [int]($sh * $scale)
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $sx, $sy, $sw, $sh), 'Pixel')
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
Write-Output "saved $Out ($w x $h)"
