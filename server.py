#!/usr/bin/env python3
"""
私人账本 — 本地 HTTP 服务器
密码哈希在浏览器端完成：安全上下文（crypto.subtle）或纯 JS fallback 均可用，
因此无需 HTTPS，局域网内手机直接访问即可。
"""
import http.server, socketserver, webbrowser, threading, os, subprocess

PORT = 8181

# ── 局域网 IP 检测 ─────────────────────────────────────────────────────────────

def _is_lan(ip):
    return (
        ip.startswith('192.168.') or
        ip.startswith('10.')      or
        (ip.startswith('172.') and 16 <= int(ip.split('.')[1]) <= 31)
    )

def local_ip():
    """返回当前活跃的局域网 IP，优先 en0（Mac Wi-Fi）。"""
    try:
        out = subprocess.check_output(['ifconfig'], text=True, stderr=subprocess.DEVNULL)
        en0_block, in_en0 = [], False
        for line in out.splitlines():
            if line.startswith('en0'):
                in_en0 = True
            elif line and not line[0].isspace():
                in_en0 = False
            if in_en0:
                en0_block.append(line.strip())
        for line in en0_block:
            if line.startswith('inet ') and 'netmask' in line:
                ip = line.split()[1]
                if _is_lan(ip):
                    return ip
        # fallback: any LAN interface
        for line in out.splitlines():
            line = line.strip()
            if line.startswith('inet ') and 'netmask' in line:
                ip = line.split()[1]
                if _is_lan(ip):
                    return ip
    except Exception:
        pass
    return '127.0.0.1'


# ── HTTP handler ──────────────────────────────────────────────────────────────

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass   # 静默，不打印每次请求


# ── 启动 ──────────────────────────────────────────────────────────────────────

os.chdir(os.path.dirname(os.path.abspath(__file__)))
ip = local_ip()

print()
print('=' * 52)
print('        私人账本  —  本地服务器已启动')
print('=' * 52)
print(f'  💻 本机浏览器：http://localhost:{PORT}/')
print(f'  📱 手机访问：  http://{ip}:{PORT}/')
print('     (手机需与电脑连接相同 Wi-Fi)')
print('=' * 52)
print('  按 Ctrl+C 停止服务器')
print()

def _open():
    import time; time.sleep(0.8)
    webbrowser.open(f'http://localhost:{PORT}/')

threading.Thread(target=_open, daemon=True).start()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), QuietHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已停止。')
