#!/usr/bin/env python3
"""
私人账本 — 本地 HTTP 服务器
密码哈希在浏览器端完成：安全上下文（crypto.subtle）或纯 JS fallback 均可用，
因此无需 HTTPS，局域网内手机直接访问即可。
"""
import http.server, socketserver, webbrowser, threading, os, subprocess, re, glob, json, urllib.parse

DATA_DIR = 'userdata'  # 用户数据存储目录

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

    def _safe_user(self, user):
        return re.sub(r'[^a-zA-Z0-9_\-]', '_', user)[:64]

    def _send_json(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/data':
            params = urllib.parse.parse_qs(parsed.query)
            user = params.get('user', [''])[0].strip()
            if not user:
                self._send_json(400, {'error': 'missing user'}); return
            filepath = os.path.join(DATA_DIR, self._safe_user(user) + '.json')
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read().encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content)
            else:
                self._send_json(404, {'error': 'not found'})
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/data':
            params = urllib.parse.parse_qs(parsed.query)
            user = params.get('user', [''])[0].strip()
            if not user:
                self._send_json(400, {'error': 'missing user'}); return
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                json.loads(body)  # 校验 JSON 合法性
            except Exception:
                self._send_json(400, {'error': 'invalid json'}); return
            os.makedirs(DATA_DIR, exist_ok=True)
            filepath = os.path.join(DATA_DIR, self._safe_user(user) + '.json')
            with open(filepath, 'wb') as f:
                f.write(body)
            self._send_json(200, {'ok': True})
            return
        self._send_json(405, {'error': 'method not allowed'})


# ── 启动 ──────────────────────────────────────────────────────────────────────

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# ── 自动 bump SW 缓存版本 ───────────────────────────────────────────────────────

def _auto_bump_sw():
    """检测 js/ 目录下文件的最新修改时间；若比 sw.js 新则自动递增版本号。"""
    sw_path = 'sw.js'
    js_files = glob.glob('js/*.js')
    if not js_files:
        return
    latest_js_mtime = max(os.path.getmtime(f) for f in js_files)
    sw_mtime = os.path.getmtime(sw_path)
    if latest_js_mtime <= sw_mtime:
        return  # sw.js 已是最新，无需 bump
    with open(sw_path, 'r', encoding='utf-8') as f:
        content = f.read()
    m = re.search(r"'wealthvault-v(\d+)'", content)
    if not m:
        return
    old_ver = int(m.group(1))
    new_ver = old_ver + 1
    new_content = content.replace(f"'wealthvault-v{old_ver}'", f"'wealthvault-v{new_ver}'")
    with open(sw_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'  ✅ SW 缓存版本已自动更新：v{old_ver} → v{new_ver}')

_auto_bump_sw()

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
