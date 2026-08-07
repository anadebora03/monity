# Gera os exports de icone PWA/landing a partir de assets/brand/master.
# Rodar com: powershell -ExecutionPolicy Bypass -File generate-exports.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$master = Join-Path $root "brand\master"
$exportIcons = Join-Path $root "brand\export\icons"
$exportLanding = Join-Path $root "brand\export\landing"

function Get-ContentBBox {
    # Acha a caixa delimitadora do conteudo real, descartando a fina
    # margem quase-branca deixada pelo gerador de imagem em volta do
    # icone (o master nao vem 100% edge-to-edge).
    param([System.Drawing.Bitmap]$bmp)
    $w = $bmp.Width; $h = $bmp.Height
    $minX=$w; $maxX=0; $minY=$h; $maxY=0
    for ($y=0; $y -lt $h; $y+=3) {
        for ($x=0; $x -lt $w; $x+=3) {
            $p = $bmp.GetPixel($x,$y)
            if (-not ($p.R -gt 245 -and $p.G -gt 245 -and $p.B -gt 245)) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    return @{ X = $minX; Y = $minY; W = ($maxX - $minX); H = ($maxY - $minY) }
}

function Get-CroppedSquare {
    # Recorta pro bbox do conteudo e forca proporcao quadrada (usa o
    # maior lado), centralizando - devolve um Bitmap novo, edge-to-edge.
    param([string]$srcPath)
    $src = New-Object System.Drawing.Bitmap $srcPath
    $bbox = Get-ContentBBox -bmp $src
    $side = [Math]::Max($bbox.W, $bbox.H)
    $cx = $bbox.X + $bbox.W / 2
    $cy = $bbox.Y + $bbox.H / 2
    $x0 = [Math]::Max(0, [int]($cx - $side / 2))
    $y0 = [Math]::Max(0, [int]($cy - $side / 2))
    $side = [Math]::Min($side, [Math]::Min($src.Width - $x0, $src.Height - $y0))
    $rect = New-Object System.Drawing.Rectangle $x0, $y0, $side, $side
    $cropped = New-Object System.Drawing.Bitmap $side, $side
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0,0,$side,$side), $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    return $cropped
}

function Resize-Square {
    param([System.Drawing.Bitmap]$src, [int]$size, [string]$destPath)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Resize-Maskable {
    # O master nao tem o glifo isolado (é bitmap achatado, sem alpha),
    # entao nao da pra compor um "safe zone" limpo sobre um fundo solido
    # sem deixar uma caixa branca visivel (o proprio recorte carrega
    # cantos brancos do fundo arredondado). Preenche o canvas 100% —
    # o glifo M+check ja fica bem centralizado e pequeno o bastante
    # pra sobreviver ao corte circular/arredondado do Android.
    param([System.Drawing.Bitmap]$src, [int]$size, [string]$destPath, [System.Drawing.Color]$bg)
    Resize-Square -src $src -size $size -destPath $destPath
}

$iconBluePath = Join-Path $master "monity-icon-blue.png"
$cropped = Get-CroppedSquare -srcPath $iconBluePath
$rawBmp = New-Object System.Drawing.Bitmap $iconBluePath
$bgColor = $rawBmp.GetPixel(80, 630)   # ponto testado dentro do fundo azul solido, longe do glifo
$rawBmp.Dispose()

# --- Icones "any" (edge-to-edge, ja recortados) ---
Resize-Square -src $cropped -size 512 -destPath (Join-Path $exportIcons "icon-512.png")
Resize-Square -src $cropped -size 192 -destPath (Join-Path $exportIcons "icon-192.png")
Resize-Square -src $cropped -size 180 -destPath (Join-Path $exportIcons "apple-touch-icon.png")
Resize-Square -src $cropped -size 32  -destPath (Join-Path $exportIcons "favicon-32.png")
Resize-Square -src $cropped -size 16  -destPath (Join-Path $exportIcons "favicon-16.png")

# --- Icones maskable (com margem de seguranca, fundo azul da marca) ---
Resize-Maskable -src $cropped -size 512 -destPath (Join-Path $exportIcons "icon-512-maskable.png") -bg $bgColor
Resize-Maskable -src $cropped -size 192 -destPath (Join-Path $exportIcons "icon-192-maskable.png") -bg $bgColor

# --- Landing ---
Resize-Square -src $cropped -size 256 -destPath (Join-Path $exportLanding "logo-mark.png")
Resize-Square -src $cropped -size 180 -destPath (Join-Path $exportLanding "apple-touch-icon.png")

# --- favicon.ico multi-tamanho (16/32/48), dados PNG embutidos (aceito desde Vista) ---
function New-Ico {
    param([System.Drawing.Bitmap]$src, [string]$destPath)
    $sizes = @(16, 32, 48)
    $pngBytesList = @()
    foreach ($s in $sizes) {
        $tmp = [System.IO.Path]::GetTempFileName() + ".png"
        Resize-Square -src $src -size $s -destPath $tmp
        $pngBytesList += ,([System.IO.File]::ReadAllBytes($tmp))
        Remove-Item $tmp -Force
    }
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
    $offset = 6 + (16 * $sizes.Count)
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i]; $bytes = $pngBytesList[$i]
        $bw.Write([Byte]$s); $bw.Write([Byte]$s)
        $bw.Write([Byte]0); $bw.Write([Byte]0)
        $bw.Write([UInt16]1); $bw.Write([UInt16]32)
        $bw.Write([UInt32]$bytes.Length); $bw.Write([UInt32]$offset)
        $offset += $bytes.Length
    }
    foreach ($bytes in $pngBytesList) { $bw.Write($bytes) }
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($destPath, $ms.ToArray())
    $bw.Close(); $ms.Close()
}
New-Ico -src $cropped -destPath (Join-Path $exportIcons "favicon.ico")

Write-Output "OK - bg azul amostrado: R=$($bgColor.R) G=$($bgColor.G) B=$($bgColor.B)"
Write-Output "Exports gerados em $exportIcons e $exportLanding"
$cropped.Dispose()
