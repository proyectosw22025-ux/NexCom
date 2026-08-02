# Respalda los archivos que NO se versionan (y por tanto se perderían al borrar
# la carpeta del proyecto): los .env con credenciales reales y, si se encuentra,
# el keystore de firma del APK.
#
#   powershell -ExecutionPolicy Bypass -File scripts\respaldar-secretos.ps1
#
# Genera un .zip con fecha en el Escritorio. Guárdalo en un lugar seguro
# (Drive, USB). NUNCA lo subas al repositorio.

$ErrorActionPreference = "Stop"
$raiz    = Split-Path -Parent $PSScriptRoot
$destino = Join-Path ([Environment]::GetFolderPath("Desktop")) "nexcom-secretos-$(Get-Date -Format yyyyMMdd-HHmm)"
New-Item -ItemType Directory -Path $destino -Force | Out-Null

# ── 1. Archivos .env del proyecto ──────────────────────────────────────────
$envs = @(".env", "backend\.env", "backend\.env.test", "frontend\.env.local")
foreach ($rel in $envs) {
    $src = Join-Path $raiz $rel
    if (Test-Path $src) {
        $sub = Join-Path $destino (Split-Path $rel -Parent)
        if ($sub -ne $destino) { New-Item -ItemType Directory -Path $sub -Force | Out-Null }
        Copy-Item $src (Join-Path $destino $rel) -Force
        Write-Host "  + $rel"
    }
}

# ── 2. Keystore de firma del APK ───────────────────────────────────────────
# Se busca donde suele quedar el paquete de PWABuilder (Descargas) y donde el
# usuario lo descomprimió. Añade aquí otra ruta si lo mueves.
$dondeBuscar = @(
    (Join-Path $env:USERPROFILE "Downloads"),
    (Join-Path ([Environment]::GetFolderPath("Desktop")) "apk sw1"),
    (Join-Path $env:USERPROFILE "OneDrive\Escritorio\apk sw1")
)
$claves = @()
foreach ($d in $dondeBuscar) {
    if (Test-Path $d) {
        $claves += Get-ChildItem $d -Recurse -ErrorAction SilentlyContinue `
            -Include *.keystore, *.jks, "signing-key-info.txt", "assetlinks.json" |
            Select-Object -First 20
    }
}
$claves = $claves | Sort-Object FullName -Unique
if ($claves.Count -gt 0) {
    $dirFirma = Join-Path $destino "firma-apk"
    New-Item -ItemType Directory -Path $dirFirma -Force | Out-Null
    foreach ($c in $claves) {
        Copy-Item $c.FullName (Join-Path $dirFirma $c.Name) -Force -ErrorAction SilentlyContinue
        Write-Host "  + firma-apk\$($c.Name)"
    }
} else {
    Write-Host "  ! No se encontro keystore del APK en Descargas (respaldalo a mano si lo tienes en otra carpeta)"
}

# ── 3. Nota de contexto para el yo del futuro ──────────────────────────────
@"
RESPALDO DE SECRETOS — NexCom
Generado: $(Get-Date -Format "yyyy-MM-dd HH:mm")

CONTENIDO
  .env / backend\.env / frontend\.env.local  → credenciales reales (BD, JWT, Stripe, Cloudinary...)
  firma-apk\                                 → keystore y datos para firmar el APK

COMO RESTAURAR
  1. git clone https://github.com/proyectosw22025-ux/NexCom.git
  2. Copiar estos .env a las mismas rutas dentro del proyecto.
  3. Para solo probar la app NO hacen falta: usar
     docker compose -f docker-compose.demo.yml up --build

DONDE ESTAN TAMBIEN ESTAS VARIABLES
  Railway (servicio diplomatic-cat) → Variables   [backend]
  Vercel  (proyecto nex-com)        → Environment Variables   [frontend]

IMPORTANTE
  El keystore NO se puede regenerar: sin el no se pueden publicar
  actualizaciones del APK con la misma identidad de app.
  Este .zip contiene secretos: NO subirlo a ningun repositorio.
"@ | Set-Content (Join-Path $destino "LEEME.txt") -Encoding UTF8

# ── 4. Comprimir y limpiar ─────────────────────────────────────────────────
$zip = "$destino.zip"
Compress-Archive -Path "$destino\*" -DestinationPath $zip -Force
Remove-Item $destino -Recurse -Force

Write-Host ""
Write-Host "Respaldo creado: $zip"
Write-Host "Guardalo en Drive/USB. Contiene secretos: no subirlo al repositorio."
