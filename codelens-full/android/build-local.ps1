param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GradleArgs
)

$defaultJavaHome = 'C:\Program Files\Android\Android Studio\jbr'
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath "$defaultJavaHome\bin\java.exe")) {
    $env:JAVA_HOME = $defaultJavaHome
}

if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath "$env:JAVA_HOME\bin\java.exe")) {
    Write-Error 'JAVA_HOME is not set and Android Studio JBR was not found. Install Android Studio or set JAVA_HOME manually.'
    exit 1
}

if (-not ($env:PATH -split ';' | Where-Object { $_ -eq "$env:JAVA_HOME\bin" })) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

if (-not $env:GRADLE_USER_HOME) {
    $env:GRADLE_USER_HOME = Join-Path $PSScriptRoot '.gradle-user-home-local'
}
if (-not (Test-Path -LiteralPath $env:GRADLE_USER_HOME)) {
    New-Item -ItemType Directory -Path $env:GRADLE_USER_HOME -Force | Out-Null
}

if (-not $env:GRADLE_OPTS) {
    $env:GRADLE_OPTS = '-Dorg.gradle.native=false'
} elseif ($env:GRADLE_OPTS -notmatch 'org\.gradle\.native=false') {
    $env:GRADLE_OPTS = "$($env:GRADLE_OPTS) -Dorg.gradle.native=false"
}

if (-not $GradleArgs -or $GradleArgs.Count -eq 0) {
    $GradleArgs = @('assembleDebug')
}

if (-not ($GradleArgs -contains '--no-daemon')) {
    $GradleArgs = @('--no-daemon') + $GradleArgs
}

& "$PSScriptRoot\gradlew.bat" @GradleArgs
exit $LASTEXITCODE
