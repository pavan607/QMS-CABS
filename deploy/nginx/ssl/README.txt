HTTPS for https://qms/login
===========================

nginx expects these two files in THIS folder (same directory as this README):

  fullchain.pem   — server certificate (PEM)
  privkey.pem     — private key (PEM)

Generate a self-signed pair (intranet / testing)
------------------------------------------------
Windows (PowerShell, in this ssl folder):

  .\generate-self-signed.ps1

Linux / macOS:

  chmod +x generate-self-signed.sh && ./generate-self-signed.sh

Or manually with OpenSSL 1.1.1+ (bash; one line on cmd use ^ at line ends):

  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout privkey.pem -out fullchain.pem \
    -subj "/CN=qms" \
    -addext "subjectAltName=DNS:qms,DNS:localhost,IP:127.0.0.1"

Replace with your PKI
---------------------
Drop real certs from your CA here using the same filenames, or point
NGINX_SSL_CERT_DIR in .env at another directory that contains fullchain.pem
and privkey.pem (e.g. Let's Encrypt /etc/letsencrypt/live/yourname/).

Then set AUTH_URL=https://qms in .env and run: docker compose up -d

Browsers will warn on self-signed certs until users trust your CA or accept the exception.
