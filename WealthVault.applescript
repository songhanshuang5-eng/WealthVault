-- WealthVault 启动器
on run
    set wvDir to do shell script "dirname " & quoted form of (POSIX path of (path to me))
    
    -- 若端口已占用，说明服务已在运行
    try
        do shell script "lsof -ti:8181 | head -1"
        open location "https://localhost:8181"
        return
    end try
    
    -- 检查 Python3
    try
        do shell script "which python3"
    on error
        display dialog "未找到 Python3，请先安装：" & return & "https://www.python.org/downloads/" buttons {"确定"} default button 1 with icon stop
        return
    end try
    
    -- 后台启动服务器，记录 PID
    do shell script "cd " & quoted form of wvDir & " && nohup python3 server.py > /tmp/wealthvault.log 2>&1 & echo $! > /tmp/wealthvault.pid"
    
    -- 等待服务就绪（最多 8 秒）
    set ready to false
    repeat 16 times
        delay 0.5
        try
            do shell script "lsof -ti:8181 | head -1"
            set ready to true
            exit repeat
        end try
    end repeat
    
    if ready then
        open location "https://localhost:8181"
    else
        display dialog "启动超时，请查看日志：" & return & "/tmp/wealthvault.log" buttons {"确定"} default button 1 with icon caution
    end if
end run

on quit
    try
        set pid to do shell script "cat /tmp/wealthvault.pid"
        do shell script "kill " & pid
        do shell script "rm -f /tmp/wealthvault.pid"
    end try
    try
        do shell script "lsof -ti:8181 | xargs kill 2>/dev/null; true"
    end try
    continue quit
end quit
