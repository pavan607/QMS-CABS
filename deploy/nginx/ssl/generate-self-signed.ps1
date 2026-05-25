$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Error "OpenSSL not found. Install Git for Windows (includes openssl) or add OpenSSL to PATH."
}

& openssl req -x509 -nodes -days 825 -newkey rsa:2048 `
    -keyout privkey.pem -out fullchain.pem `
    -subj "/CN=qms" `
    -addext "subjectAltName=DNS:qms,DNS:localhost,IP:127.0.0.1"

if ($LASTEXITCODE -ne 0) {
    Write-Error "openssl failed. If -addext is unsupported, use OpenSSL 1.1.1+ or generate with SAN via openssl.cnf (see README.txt)."
}

Write-Host "Created fullchain.pem and privkey.pem in $PSScriptRoot"
