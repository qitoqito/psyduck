#!/bin/bash

# 目标安装目录
INSTALL_DIR="/opt/psyduck"
mkdir -p "$INSTALL_DIR"

# 自动检测系统类型
if grep -q "Alpine" /etc/os-release; then
    SYSTEM="alpine"
elif grep -q "Debian" /etc/os-release || grep -q "Ubuntu" /etc/os-release; then
    SYSTEM="debian"
else
    echo "未知系统类型，请手动选择编译方式。"
    SYSTEM="unknown"
fi

# 如果系统类型未知，提示用户手动选择
if [ "$SYSTEM" = "unknown" ]; then
    echo "请选择编译方式："
    echo "1. Alpine"
    echo "2. Debian/Ubuntu"
    read -p "请输入序号 (1 或 2，直接回车默认选择 1): " CHOICE
    if [ -z "$CHOICE" ]; then
        CHOICE="1"
    fi
    if [ "$CHOICE" = "1" ]; then
        SYSTEM="alpine"
    elif [ "$CHOICE" = "2" ]; then
        SYSTEM="debian"
    else
        echo "无效选择，退出脚本。"
        exit 1
    fi
fi

# 选择 curl 版本
echo "请选择 curl 版本："
echo "1. curl 8.12.1（最新稳定版）"
echo "2. curl 7.88.1（兼容旧版）"
read -p "请输入序号 (1 或 2，直接回车默认选择 1): " CURL_CHOICE
if [ -z "$CURL_CHOICE" ]; then
    CURL_CHOICE="1"
fi
if [ "$CURL_CHOICE" = "1" ]; then
    CURL_VERSION="8.12.1"
    CURL_FILENAME="curl-8.12.1.tar.gz"
elif [ "$CURL_CHOICE" = "2" ]; then
    CURL_VERSION="7.88.1"
    CURL_FILENAME="curl-7.88.1.tar.gz"
else
    echo "无效选择，退出脚本。"
    exit 1
fi

# 定义 curl 下载地址列表（主地址 + 备用地址）
CURL_URLS=(
    "https://curl.se/download/$CURL_FILENAME"  # 主地址
    "https://github.com/curl/curl/releases/download/curl-${CURL_VERSION//./_}/$CURL_FILENAME"  # GitHub Releases
    "https://mirrors.kernel.org/curl/$CURL_FILENAME"  # kernel.org 镜像
    "https://mirrors.cloud.tencent.com/curl/$CURL_FILENAME"  # 腾讯云镜像
    "http://ftpmirror.gnu.org/curl/$CURL_FILENAME"  # GNU 镜像
)

# 下载 curl 源码
download_curl() {
    for url in "${CURL_URLS[@]}"; do
        echo "尝试下载: $url"
        if wget -q --tries=3 --timeout=10 "$url"; then
            echo "下载成功: $url"
            return 0
        else
            echo "下载失败: $url"
        fi
    done
    echo "所有下载地址均失败，请检查网络或手动下载。"
    exit 1
}

# 选择 LibreSSL 版本
echo "请选择 LibreSSL 版本："
echo "1. LibreSSL 3.8.4（最新稳定版）"
echo "2. LibreSSL 3.7.3（兼容旧版）"
read -p "请输入序号 (1 或 2，直接回车默认选择 1): " LIBRESSL_CHOICE
if [ -z "$LIBRESSL_CHOICE" ]; then
    LIBRESSL_CHOICE="1"
fi
if [ "$LIBRESSL_CHOICE" = "1" ]; then
    LIBRESSL_VERSION="3.8.4"
    LIBRESSL_URL="https://ftp.openbsd.org/pub/OpenBSD/LibreSSL/libressl-3.8.4.tar.gz"
elif [ "$LIBRESSL_CHOICE" = "2" ]; then
    LIBRESSL_VERSION="3.7.3"
    LIBRESSL_URL="https://ftp.openbsd.org/pub/OpenBSD/LibreSSL/libressl-3.7.3.tar.gz"
else
    echo "无效选择，退出脚本。"
    exit 1
fi

# 安装依赖
if [ "$SYSTEM" = "alpine" ]; then
    echo "检测到 Alpine 系统，安装 Alpine 依赖..."
    apk add --no-cache build-base wget libtool automake vim pkgconfig zlib-dev libssh2-dev nghttp2-dev openssl-dev libpsl-dev
elif [ "$SYSTEM" = "debian" ]; then
    echo "检测到 Debian/Ubuntu 系统，安装 Debian 依赖..."
    apt-get update
    apt-get install -y build-essential wget libtool automake vim pkg-config zlib1g-dev libssh2-1-dev libnghttp2-dev libssl-dev libpsl-dev
fi

# 下载并安装 LibreSSL
cd /root
wget "$LIBRESSL_URL"
tar -xvzf "libressl-${LIBRESSL_VERSION}.tar.gz"
cd "libressl-${LIBRESSL_VERSION}"

# 配置并编译 LibreSSL
./configure --prefix="$INSTALL_DIR/libressl"
make
make install

# 验证 LibreSSL 安装
echo "LibreSSL 版本:"
"$INSTALL_DIR/libressl/bin/openssl" version

# 验证系统 openssl 版本（确保仍然是系统自带的 OpenSSL）
echo "系统 OpenSSL 版本:"
openssl version

# 下载 curl 源码
cd /root
download_curl
tar -xvzf "$CURL_FILENAME"
cd "curl-${CURL_VERSION}"

# 配置并编译 curl，显式指定 LibreSSL 的路径
./configure --with-ssl="$INSTALL_DIR/libressl" --disable-shared --enable-static --program-prefix=psyduck- --prefix="$INSTALL_DIR/curl"
make
make install

# 验证 psyduck-curl 安装
echo "psyduck-curl 版本:"
"$INSTALL_DIR/curl/bin/psyduck-curl" --version

# 检查 psyduck-curl 是否链接到 LibreSSL
if "$INSTALL_DIR/curl/bin/psyduck-curl" --version | grep -q "LibreSSL"; then
    echo "编译成功：psyduck-curl 已正确链接到 LibreSSL！"
else
    echo "编译失败：psyduck-curl 未链接到 LibreSSL！"
    exit 1
fi

echo "编译完成！psyduck-curl 已安装到 $INSTALL_DIR/curl/bin/psyduck-curl"
