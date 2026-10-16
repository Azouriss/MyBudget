param([switch]$SkipChecks)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-NativeTool.ps1')
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location $projectPath
$env:EXPO_NO_TELEMETRY = '1'
$env:CI = '1'
$env:NODE_ENV = 'production'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = "$projectPath\.expo\cli-home"
$env:npm_config_cache = "$projectPath\.expo\npm-cache"
$env:GRADLE_USER_HOME = "$projectPath\.expo\gradle-home"
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Java\jdk-17' }
if (-not $env:ANDROID_HOME) {
  if (Test-Path "$projectPath\.expo\android-sdk\ndk\27.1.12297006\source.properties") { $env:ANDROID_HOME = "$projectPath\.expo\android-sdk" }
  else { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
}
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
if (-not (Test-Path "$env:JAVA_HOME\bin\javac.exe")) { throw 'Un JDK Windows valide est requis dans JAVA_HOME.' }
if (-not (Test-Path "$env:ANDROID_HOME\platforms\android-36")) { throw 'Android SDK 36 absent. Définir ANDROID_HOME vers le SDK installé.' }
if (-not $SkipChecks) { Invoke-NativeTool -FileName 'npm.cmd' -ToolArguments @('run', 'release:check') }
$scriptsBeforePrebuild = (Get-Content package.json -Raw | ConvertFrom-Json).scripts.android
Invoke-NativeTool -FileName 'node.exe' -ToolArguments @('node_modules/expo/bin/cli','prebuild','--platform','android','--no-install')
# Expo rewrites this script during prebuild. Keep the established development command.
$env:MYBUDGET_ANDROID_DEV_SCRIPT = $scriptsBeforePrebuild
Invoke-NativeTool -FileName 'node.exe' -ToolArguments @('scripts/prepare-android-local.cjs')
Remove-Item Env:MYBUDGET_ANDROID_DEV_SCRIPT
$signing = (Get-Content credentials.json -Raw | ConvertFrom-Json).android.keystore
$env:MYBUDGET_KEYSTORE_PATH = [IO.Path]::GetFullPath((Join-Path $projectPath $signing.keystorePath))
$env:MYBUDGET_KEYSTORE_PASSWORD = $signing.keystorePassword
$env:MYBUDGET_KEY_ALIAS = $signing.keyAlias
$env:MYBUDGET_KEY_PASSWORD = $signing.keyPassword
$config = (Get-Content app.json -Raw | ConvertFrom-Json).expo
$buildCode = [int]$config.android.versionCode
$statePath = "$projectPath\signing\build-state.json"
if (Test-Path $statePath) { $state = Get-Content $statePath -Raw | ConvertFrom-Json; $buildCode = [Math]::Max($buildCode, [int]$state.versionCode + 1) }
$mappedCacheDrive = $null
$gradle = $null
$buildStartedAt = Get-Date
try {
  # A temporary DOS drive keeps native dependency paths below Ninja's Windows limit.
  # It maps only this project's cache and is removed after the build.
  foreach ($letter in @('M','N','P','Q','R','S','T','U','V','W','X','Y','Z')) {
    $candidate = $letter + ':'
    if (-not (Test-Path ($candidate + '\'))) {
      Invoke-NativeTool -FileName 'subst.exe' -ToolArguments @($candidate, "$projectPath\.expo\gradle-home")
      $mappedCacheDrive = $candidate
      $env:GRADLE_USER_HOME = $candidate + '\'
      break
    }
  }
  if (-not $mappedCacheDrive) { throw 'Aucune lettre de lecteur libre pour les chemins courts du cache Android.' }
  # Reuse an installed distribution when available, keeping new caches inside the project.
  $gradle = Get-ChildItem "$env:USERPROFILE\.gradle\wrapper\dists\gradle-9.3.1-all" -Recurse -Filter gradle.bat -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  Push-Location android
  try {
    if (-not $gradle) { $gradle = (Join-Path $PWD 'gradlew.bat') }
    Invoke-NativeTool -FileName $gradle -ToolArguments @(':app:assembleRelease','--console=plain','--max-workers=2',"-PmyBudgetVersionCode=$buildCode",'-PreactNativeArchitectures=armeabi-v7a,arm64-v8a','-Pandroid.builder.sdkDownload=false')
  } finally { Pop-Location }
  $sourceApk = "$projectPath\android\app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $sourceApk)) { throw 'APK release absent après compilation.' }
  $tools = "$env:ANDROID_HOME\build-tools\36.0.0"
  Invoke-NativeTool -FileName "$env:JAVA_HOME\bin\java.exe" -ToolArguments @('-jar',"$tools\lib\apksigner.jar",'verify','--verbose','--print-certs',$sourceApk)
  $badging = Invoke-NativeTool -FileName "$tools\aapt2.exe" -ToolArguments @('dump','badging',$sourceApk)
  $expectedPackage = [regex]::Escape($config.android.package)
  $expectedVersion = [regex]::Escape($config.version)
  if (($badging -join "`n") -notmatch "(?m)^package: name='$expectedPackage' versionCode='$buildCode' versionName='$expectedVersion'") { throw 'Identité ou version APK invalide.' }
  if (($badging -join "`n") -match 'application-debuggable') { throw 'APK de débogage refusé.' }
  New-Item -ItemType Directory -Force dist | Out-Null
  $destination = "$projectPath\dist\MyBudget-$($config.version)-$buildCode.apk"
  Copy-Item $sourceApk $destination
  $hash = (Get-FileHash -Algorithm SHA256 $destination).Hash.ToLowerInvariant()
  "$hash  $([IO.Path]::GetFileName($destination))" | Set-Content "$destination.sha256" -Encoding ascii
  @{ versionCode = $buildCode; version = $config.version; apk = $destination; sha256 = $hash } | ConvertTo-Json | Set-Content $statePath -Encoding utf8
  Write-Output "APK prêt : $destination"
  Write-Output "SHA256 : $hash"
} finally {
  if ($mappedCacheDrive) {
    try {
      $log = Get-ChildItem "$projectPath\.expo\gradle-home\daemon\9.3.1\daemon-*.out.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      $ownedDaemonId = if ($log -and $log.LastWriteTime -ge $buildStartedAt) { [int]([regex]::Match($log.Name, '^daemon-(\d+)\.out\.log$').Groups[1].Value) } else { 0 }
      if ($gradle) { Invoke-NativeTool -FileName $gradle -ToolArguments @('--stop') }
      if ($ownedDaemonId) {
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$ownedDaemonId" -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -match 'KotlinCompileDaemon' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      }
    } finally { Invoke-NativeTool -FileName 'subst.exe' -ToolArguments @($mappedCacheDrive, '/d') }
    $env:GRADLE_USER_HOME = "$projectPath\.expo\gradle-home"
  }
  Remove-Item Env:MYBUDGET_KEYSTORE_PASSWORD,Env:MYBUDGET_KEY_PASSWORD,Env:MYBUDGET_KEY_ALIAS,Env:MYBUDGET_KEYSTORE_PATH -ErrorAction SilentlyContinue
}
