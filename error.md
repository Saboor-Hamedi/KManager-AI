npm run publish
npm warn cli npm v12.0.2 does not support Node.js v22.21.0. This version of npm supports the following node versions: `^22.22.2 || ^24.15.0 || >=26.0.0`. You can find the latest version at https://nodejs.org/.
npm notice run kmanager@1.0.7 publish
npm notice run node scripts/publish.js

═════════════════════════════════════════════════════════════════
  KManager AI - Automated Multi-Platform Release & Publish
═════════════════════════════════════════════════════════════════

Current version:  1.0.7
New release tag:  v1.0.8 (version 1.0.8)

✔ Updated package.json to 1.0.8

Staging and committing release changes...
> git add -A
warning: in the working copy of 'package.json', LF will be replaced by CRLF the next time Git touches it
> git commit -m "chore(release): v1.0.8"
[improve-search 8f92616] chore(release): v1.0.8
 1 file changed, 1 insertion(+), 1 deletion(-)

Creating Git tag v1.0.8...
> git tag -a "v1.0.8" -m "Release v1.0.8"

Compiling and publishing Windows installer with auto-updater metadata...
> npm run build
npm warn cli npm v12.0.2 does not support Node.js v22.21.0. This version of npm supports the following node versions: `^22.22.2 || ^24.15.0 || >=26.0.0`. You can find the latest version at https://nodejs.org/.
npm notice run kmanager@1.0.8 build
npm notice run electron-vite build
vite v7.3.6 building ssr environment for production...
