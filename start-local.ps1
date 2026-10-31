param([int]$Port=4317,[switch]$OpenBrowser)
$ErrorActionPreference='Stop'
$staticRoot=[IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix=$staticRoot+[IO.Path]::DirectorySeparatorChar
$marker='remembering-manor-local-v4|'+$staticRoot
$listener=$null
foreach($candidate in $Port..($Port+20)) {
 try {
  $probe=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$candidate)
  $probe.Start(128)
  $listener=$probe
  $Port=$candidate
  break
 } catch {
  try {
   $response=Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:'+$candidate+'/__manor_health') -TimeoutSec 2
   if($response.Content -eq $marker) {
    $localUrl='http://127.0.0.1:'+$candidate+'/index.html'
    Write-Host ('Local: '+$localUrl)
    if($OpenBrowser){Start-Process $localUrl}
    exit 0
   }
  } catch {}
 }
}
if($null -eq $listener){throw 'No available local port in the selected range.'}
$localUrl='http://127.0.0.1:'+$Port+'/index.html'
Write-Host ('Local: '+$localUrl)
Write-Host 'The original demo is ready. Keep this window open while playing. Ctrl+C stops the local server.'
if($OpenBrowser){Start-Process $localUrl}
$types=@{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.mjs'='text/javascript; charset=utf-8';'.json'='application/json; charset=utf-8';'.webp'='image/webp';'.png'='image/png';'.svg'='image/svg+xml';'.jpg'='image/jpeg';'.mp3'='audio/mpeg';'.wav'='audio/wav';'.ogg'='audio/ogg';'.woff2'='font/woff2';'.ttf'='font/ttf';'.txt'='text/plain; charset=utf-8'}
try {
 while($true) {
  $client=$listener.AcceptTcpClient()
  $stream=$null
  try {
   $client.NoDelay=$true
   $stream=$client.GetStream()
   $stream.ReadTimeout=5000
   $reader=[IO.StreamReader]::new($stream,[Text.Encoding]::ASCII,$false,4096,$true)
   $first=$reader.ReadLine()
   if([string]::IsNullOrWhiteSpace($first)){continue}
   $parts=$first.Split(' ')
   $headers=@{}
   while($true){$line=$reader.ReadLine();if([string]::IsNullOrEmpty($line)){break};$split=$line.IndexOf(':');if($split -gt 0){$headers[$line.Substring(0,$split).ToLowerInvariant()]=$line.Substring($split+1).Trim()}}
   $method=$parts[0]
   $path=[Uri]::UnescapeDataString(($parts[1] -split '\?')[0])
   $status='200 OK';$contentType='text/plain; charset=utf-8';$body=[byte[]]@();$rangeHeader='';$offset=0L;$length=0L
   if($method -notin @('GET','HEAD')){$status='405 Method Not Allowed'}
   elseif($path -eq '/__manor_health'){$body=[Text.Encoding]::UTF8.GetBytes($marker)}
   else {
    if($path -eq '/'){$path='/index.html'}
    $relative=$path.TrimStart('/').Replace('/',[IO.Path]::DirectorySeparatorChar)
    $resolved=[IO.Path]::GetFullPath((Join-Path $staticRoot $relative))
    if(-not $resolved.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)){$status='403 Forbidden'}
    elseif(-not [IO.File]::Exists($resolved)){$status='404 Not Found'}
    else {
     $body=[IO.File]::ReadAllBytes($resolved)
     $extension=[IO.Path]::GetExtension($resolved).ToLowerInvariant()
     if($types.ContainsKey($extension)){$contentType=$types[$extension]}else{$contentType='application/octet-stream'}
    }
   }
   $length=$body.LongLength
   if($status -eq '200 OK' -and $headers.ContainsKey('range') -and $headers['range'] -match '^bytes=(\d*)-(\d*)$' -and $length -gt 0) {
    $total=$length;$startText=$Matches[1];$endText=$Matches[2]
    if($startText -eq ''){$offset=[Math]::Max(0,$total-[long]$endText);$end=$total-1}else{$offset=[long]$startText;$end=if($endText -eq ''){$total-1}else{[Math]::Min([long]$endText,$total-1)}}
    if($offset -ge $total -or $end -lt $offset){$status='416 Range Not Satisfiable';$length=0;$rangeHeader='Content-Range: bytes */'+$total+"`r`n"}
    else{$status='206 Partial Content';$length=$end-$offset+1;$rangeHeader='Content-Range: bytes '+$offset+'-'+$end+'/'+$total+"`r`n"}
   }
   $text="HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $length`r`nAccept-Ranges: bytes`r`nCache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`n${rangeHeader}Connection: close`r`n`r`n"
   $encoded=[Text.Encoding]::ASCII.GetBytes($text)
   $stream.Write($encoded,0,$encoded.Length)
   if($method -ne 'HEAD' -and $length -gt 0){$stream.Write($body,[int]$offset,[int]$length)}
   $stream.Flush()
  } catch {Write-Verbose $_.Exception.Message}
  finally {if($null -ne $stream){$stream.Dispose()};$client.Close()}
 }
} finally {$listener.Stop()}
