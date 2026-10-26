# Compila kiosk/build/bbds-kiosk.apk sin Gradle.
# Requiere un JDK (17+) y el SDK de Android con build-tools >= 35 y platform 34.
$ErrorActionPreference = 'Stop'
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$bt = Get-ChildItem "$sdk\build-tools" | Where-Object { [version]$_.Name -ge [version]'35.0.0' } |
    Sort-Object { [version]$_.Name } | Select-Object -Last 1 -ExpandProperty FullName
if (-not $bt) { throw "Falta build-tools >= 35 en $sdk" }
$jar = "$sdk\platforms\android-34\android.jar"
$javac = (Get-Command javac).Source
$jdk = Split-Path $javac
$here = $PSScriptRoot
$out = "$here\build"

Remove-Item -Recurse -Force $out -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$out\classes", "$out\dex" | Out-Null

# Las herramientas escriben avisos en stderr; se valida por código de salida.
$ErrorActionPreference = 'Continue'
function Step($what) { if ($LASTEXITCODE -ne 0) { throw "Falló: $what" } }

& $javac --release 8 -nowarn -XDsuppressNotes -cp $jar -d "$out\classes" (Get-ChildItem -Recurse "$here\src" -Filter *.java).FullName 2>&1 | Out-Host; Step javac
& "$bt\d8.bat" --min-api 23 --lib $jar --output "$out\dex" (Get-ChildItem -Recurse "$out\classes" -Filter *.class).FullName; Step d8
& "$bt\aapt2.exe" link -o "$out\base.apk" -I $jar --manifest "$here\AndroidManifest.xml"; Step aapt2
Push-Location "$out\dex"; & "$jdk\jar.exe" uf ..\base.apk classes.dex; Pop-Location; Step jar
& "$bt\zipalign.exe" -f 4 "$out\base.apk" "$out\aligned.apk"; Step zipalign

$ks = "$env:USERPROFILE\.android\debug.keystore"
if (-not (Test-Path $ks)) {
    & "$jdk\keytool.exe" -genkeypair -keystore $ks -storepass android -keypass android `
        -alias androiddebugkey -keyalg RSA -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}
& "$bt\apksigner.bat" sign --ks $ks --ks-pass pass:android --out "$out\bbds-kiosk.apk" "$out\aligned.apk" 2>$null; Step apksigner
Write-Host "APK: $out\bbds-kiosk.apk"
