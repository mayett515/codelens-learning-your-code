@ECHO OFF
SETLOCAL

SET APP_BASE_NAME=%~n0
SET APP_HOME=%~dp0
SET DEFAULT_JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

IF "%JAVA_HOME%"=="" (
    IF EXIST "%DEFAULT_JAVA_HOME%\bin\java.exe" (
        SET "JAVA_HOME=%DEFAULT_JAVA_HOME%"
    )
)

IF "%JAVA_HOME%"=="" GOTO javaError
IF NOT EXIST "%JAVA_HOME%\bin\java.exe" GOTO javaError

SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
IF "%GRADLE_OPTS%"=="" (
    SET "GRADLE_OPTS=-Dorg.gradle.native=false"
) ELSE (
    ECHO %GRADLE_OPTS% | findstr /i "org.gradle.native=false" >NUL
    IF ERRORLEVEL 1 SET "GRADLE_OPTS=%GRADLE_OPTS% -Dorg.gradle.native=false"
)

SET "CACHED_GRADLE_BAT="
FOR /F "delims=" %%F IN ('dir /b /s "%USERPROFILE%\.gradle\wrapper\dists\gradle.bat" 2^>NUL ^| findstr /i "\\gradle-8.13\\bin\\gradle.bat"') DO (
    SET "CACHED_GRADLE_BAT=%%F"
    GOTO cachedGradleFound
)
:cachedGradleFound
IF NOT "%CACHED_GRADLE_BAT%"=="" (
    CALL "%CACHED_GRADLE_BAT%" %*
    EXIT /B %ERRORLEVEL%
)

SET "CLASSPATH=%APP_HOME%gradle\wrapper\gradle-wrapper.jar"
SET "WRAPPER_SHARED_JAR="
FOR /F "delims=" %%F IN ('dir /b /s "%USERPROFILE%\.gradle\wrapper\dists\gradle-wrapper-shared-8.13.jar" 2^>NUL') DO (
    SET "WRAPPER_SHARED_JAR=%%F"
    GOTO wrapperSharedFound
)
:wrapperSharedFound
IF NOT "%WRAPPER_SHARED_JAR%"=="" (
    SET "CLASSPATH=%CLASSPATH%;%WRAPPER_SHARED_JAR%"
)

"%JAVA_EXE%" -Xmx64m -Xms64m -Dorg.gradle.appname=%APP_BASE_NAME% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
EXIT /B %ERRORLEVEL%

:javaError
ECHO.
ECHO ERROR: JAVA_HOME is not set to a valid JDK.
ECHO.
ECHO Set JAVA_HOME, for example:
ECHO   set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
ECHO.
EXIT /B 1
