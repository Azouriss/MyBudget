function Invoke-NativeTool {
  param([Parameter(Mandatory=$true)][string]$FileName, [string[]]$ToolArguments = @())
  # Windows PowerShell turns native stderr into error records when redirected.
  # A successful compiler may emit warnings there; only its exit code decides success.
  $ErrorActionPreference = 'Continue'
  $command = Get-Command $FileName -ErrorAction Stop
  & $command.Source @ToolArguments
  $nativeExitCode = $LASTEXITCODE
  if ($nativeExitCode -ne 0) { throw "Echec de $([IO.Path]::GetFileName($FileName)) (code $nativeExitCode)." }
}
