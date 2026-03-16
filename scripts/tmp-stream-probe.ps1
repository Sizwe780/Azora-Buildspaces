$ErrorActionPreference = 'Stop'

$body = @{
  messages = @(
    @{
      role = 'user'
      content = 'Reply briefly: local mistral stream test works'
    }
  )
  model = 'mistral-7b'
} | ConvertTo-Json -Depth 8

try {
  $resp = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/agents/stream' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 660
  Write-Output ('STREAM_STATUS ' + $resp.StatusCode)
  Write-Output $resp.Content
} catch {
  if ($_.Exception.Response) {
    Write-Output ('STREAM_ERR_STATUS ' + [int]$_.Exception.Response.StatusCode)
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $reader.ReadToEnd()
  } else {
    Write-Output ('STREAM_ERR ' + $_.Exception.Message)
  }
}
