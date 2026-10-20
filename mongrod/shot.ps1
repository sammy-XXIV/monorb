param($name, $q, $size = "900,700")
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$o = "C:\Users\Dell\chogverse\doctor\_$name.png"
$a = @("--headless=new","--use-angle=swiftshader","--enable-unsafe-swiftshader","--window-size=$size","--virtual-time-budget=9000","--user-data-dir=$env:TEMP\mon_$name","--screenshot=$o","http://127.0.0.1:8125/mongrod/viewer.html?$q&r=$(Get-Random)")
Start-Process -FilePath $edge -ArgumentList $a -Wait -NoNewWindow -RedirectStandardError "$env:TEMP\mon_$name.log"
