til-character@2.1.1","unified@11.0.5"]
  • updating asar integrity executable resource  executablePath=dist\win-unpacked\kmanager.exe
  • signing with signtool.exe  path=dist\win-unpacked\kmanager.exe
  • building        target=nsis file=dist\kmanager-1.0.6-setup.exe archs=x64 oneClick=true perMachine=false
  • signing with signtool.exe  path=dist\win-unpacked\resources\elevate.exe
  • signing with signtool.exe  path=dist\kmanager-1.0.6-setup.__uninstaller.exe
  • signing with signtool.exe  path=dist\kmanager-1.0.6-setup.exe
  • building block map  blockMapFile=dist\kmanager-1.0.6-setup.exe.blockmap
  • publishing      publisher=Github (owner: Saboor-Hamedi, project: KManager-AI, version: 1.0.6)
  • publishing      publisher=Github (owner: Saboor-Hamedi, project: KManager-AI, version: 1.0.6)
  • uploading       file=kmanager-1.0.6-setup.exe.blockmap provider=github
  • uploading       file=kmanager-1.0.6-setup.exe provider=github
  • creating GitHub release  reason=release doesn't exist tag=v1.0.6 version=1.0.6
  • creating GitHub release  reason=release doesn't exist tag=v1.0.6 version=1.0.6
  ⨯ 422 Unprocessable Entity
"method: post url: https://api.github.com/repos/Saboor-Hamedi/KManager-AI/releases\n\n          Data:\n          {\n  \"message\": \"Validation Failed\",\n  \"errors\": [\n    {\n      \"resource\": \"Release\",\n      \"code\": \"custom\",\n      \"message\": \"Published releases must have a valid tag\"\n    }\n  ],\n  \"documentation_url\": \"https://docs.github.com/rest/releases/releases#create-a-release\",\n  \"status\": \"422\"\n}\n          "
Headers: {
  "date": "Sun, 23 Aug 2026 12:14:27 GMT",
  "content-type": "application/json; charset=utf-8",
  "content-length": "235",
  "x-oauth-scopes": "b894ca4f0f304deb58b4c83ccf5b37ac3c8f80e097a91bd5d8b39430c410f901 (sha256 hash)",
  "x-accepted-oauth-scopes": "071ca2227754705837aa3ef9748ed59e9f8a015fd765c42f391a4cbc271c6d5e (sha256 hash)",
  "github-authentication-token-expiration": "ae33f69bc28013b9404d4bac0b176ae4061f2d91f94007767b6aa725e009f83a (sha256 hash)",
  "x-github-media-type": "github.v3; format=json",
  "x-github-api-version-selected": "2022-11-28",
  "access-control-expose-headers": "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset, Warning",
  "access-control-allow-origin": "*",
  "strict-transport-security": "max-age=31536000; includeSubdomains; preload",
  "x-frame-options": "deny",
  "x-content-type-options": "nosniff",
  "x-xss-protection": "0",
  "referrer-policy": "origin-when-cross-origin, strict-origin-when-cross-origin",
  "content-security-policy": "default-src 'none'",
  "vary": "Accept-Encoding, Accept, X-Requested-With",
  "server": "github.com",
  "x-ratelimit-limit": "5000",
  "x-ratelimit-remaining": "4993",
  "x-ratelimit-reset": "1787489556",
  "x-ratelimit-used": "7",
  "x-ratelimit-resource": "core",
  "x-github-request-id": "E075:F5530:17A97A1:18DA7D8:6A8AE423",
  "x-github-edge-region": "southeastasia"
}  failedTask=build stackTrace=HttpError: 422 Unprocessable Entity
"method: post url: https://api.github.com/repos/Saboor-Hamedi/KManager-AI/releases\n\n          Data:\n          {\n  \"message\": \"Validation Failed\",\n  \"errors\": [\n    {\n      \"resource\": \"Release\",\n      \"code\": \"custom\",\n      \"message\": \"Published releases must have a valid tag\"\n    }\n  ],\n  \"documentation_url\": \"https://docs.github.com/rest/releases/releases#create-a-release\",\n  \"status\": \"422\"\n}\n          "
Headers: {
  "date": "Sun, 23 Aug 2026 12:14:27 GMT",
  "content-type": "application/json; charset=utf-8",
  "content-length": "235",
  "x-oauth-scopes": "b894ca4f0f304deb58b4c83ccf5b37ac3c8f80e097a91bd5d8b39430c410f901 (sha256 hash)",
  "x-accepted-oauth-scopes": "071ca2227754705837aa3ef9748ed59e9f8a015fd765c42f391a4cbc271c6d5e (sha256 hash)",
  "github-authentication-token-expiration": "ae33f69bc28013b9404d4bac0b176ae4061f2d91f94007767b6aa725e009f83a (sha256 hash)",
  "x-github-media-type": "github.v3; format=json",
  "x-github-api-version-selected": "2022-11-28",
  "access-control-expose-headers": "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset, Warning",
  "access-control-allow-origin": "*",
  "strict-transport-security": "max-age=31536000; includeSubdomains; preload",
  "x-frame-options": "deny",
  "x-content-type-options": "nosniff",
  "x-xss-protection": "0",
  "referrer-policy": "origin-when-cross-origin, strict-origin-when-cross-origin",
  "content-security-policy": "default-src 'none'",
  "vary": "Accept-Encoding, Accept, X-Requested-With",
  "server": "github.com",
  "x-ratelimit-limit": "5000",
  "x-ratelimit-remaining": "4993",
  "x-ratelimit-reset": "1787489556",
  "x-ratelimit-used": "7",
  "x-ratelimit-resource": "core",
  "x-github-request-id": "E075:F5530:17A97A1:18DA7D8:6A8AE423",
  "x-github-edge-region": "southeastasia"
}
    at createHttpError (B:\kmanager\node_modules\builder-util-runtime\src\httpExecutor.ts:66:10)
    at IncomingMessage.<anonymous> (B:\kmanager\node_modules\builder-util-runtime\src\httpExecutor.ts:241:13)
    at IncomingMessage.emit (node:events:531:35)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at processTicksAndRejections (node:internal/process/task_queues:90:21)