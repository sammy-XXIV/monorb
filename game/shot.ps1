# usage: shot.ps1 <name> <query> [w,h] [budget]  -> _<name>.png + _<name>.log (console lines)
param($name, $q, $size = "1000,650", $budget = 25000)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$o = "C:\Users\Dell\chogverse\game\_$name.png"; $errf = "C:\Users\Dell\chogverse\game\_$name.log"
$a = @("--headless=new","--use-angle=swiftshader","--enable-unsafe-swiftshader","--enable-logging=stderr","--v=0","--window-size=$size","--virtual-time-budget=$budget","--user-data-dir=$env:TEMP\shot_$name","--screenshot=$o","http://127.0.0.1:8125/game/index.html?$q&r=$(Get-Random)")
Start-Process -FilePath $edge -ArgumentList $a -Wait -RedirectStandardError $errf -NoNewWindow
Get-Content $errf | Select-String -Pattern "CONSOLE.*(rror|Uncaught|warn|decor merged|fps)" | Where-Object { $_.Line -notmatch "AudioContext|ProtocolLaunch" } | Select-Object -First 6 | ForEach-Object { $_.Line.Substring(0, [Math]::Min(260, $_.Line.Length)) }
