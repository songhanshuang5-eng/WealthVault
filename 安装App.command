#!/bin/bash
# 运行一次，自动生成 WealthVault.app 并设置图标
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/WealthVault.app"
AS="$DIR/WealthVault.applescript"
ICON_SRC="$DIR/icons/icon-192.png"

echo ""
echo "  💰  WealthVault — 生成桌面应用"
echo "  ─────────────────────────────────"
echo ""

# 编译 AppleScript → .app
echo "  🔨 编译应用..."
osacompile -o "$APP" "$AS"
if [ $? -ne 0 ]; then
    echo "  ❌ 编译失败"
    read -p "  按回车键关闭..."
    exit 1
fi

# 生成 .icns 图标
if [ -f "$ICON_SRC" ]; then
    echo "  🎨 生成图标..."
    ICONSET="/tmp/wv_icon.iconset"
    rm -rf "$ICONSET" && mkdir "$ICONSET"
    for size in 16 32 64 128 256 512; do
        sips -z $size $size "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}.png" &>/dev/null
        double=$((size*2))
        sips -z $double $double "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" &>/dev/null
    done
    iconutil -c icns "$ICONSET" -o /tmp/wv.icns 2>/dev/null
    if [ -f /tmp/wv.icns ]; then
        cp /tmp/wv.icns "$APP/Contents/Resources/applet.icns"
        # 通知 Finder 刷新图标
        touch "$APP"
        echo "  ✅ 图标设置完成"
    fi
fi

# 移除隔离属性（避免 Gatekeeper 拦截）
echo "  🔓 解除系统安全限制..."
xattr -dr com.apple.quarantine "$APP" 2>/dev/null

echo ""
echo "  ✅ 完成！WealthVault.app 已创建"
echo ""
echo "  👉 下一步：把 WealthVault.app 拖到桌面或应用程序文件夹"
echo "     双击即可启动，无需打开 Terminal"
echo ""
read -p "  按回车键关闭..."
