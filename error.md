move-position@5.0.0","devlop@1.1.0","katex@0.16.47","micromark-util-character@2.1.1","unified@11.0.5"]
  • updating asar integrity executable resource  executablePath=dist\win-unpacked\kmanager.exe
  • default Electron icon is used  reason=application icon is not set
  • signing with signtool.exe  path=dist\win-unpacked\kmanager.exe
  • building        target=nsis file=dist\kmanager-1.0.6-setup.exe archs=x64 oneClick=true perMachine=false
  • signing with signtool.exe  path=dist\win-unpacked\resources\elevate.exe
  • signing with signtool.exe  path=dist\kmanager-1.0.6-setup.__uninstaller.exe
  • signing with signtool.exe  path=dist\kmanager-1.0.6-setup.exe
  • building block map  blockMapFile=dist\kmanager-1.0.6-setup.exe.blockmap
  • publishing      publisher=Github (owner: Saboor-Hamedi, project: KManager-AI, version: 1.0.6)
  • uploading       file=kmanager-1.0.6-setup.exe.blockmap provider=github
  • uploading       file=kmanager-1.0.6-setup.exe provider=github
  ⨯ Cannot cleanup: 

Error #1 --------------------------------------------------------------------------------
Error: connect ETIMEDOUT 20.205.243.168:443
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)

Error #2 --------------------------------------------------------------------------------
Error: connect ETIMEDOUT 20.205.243.168:443
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)  failedTask=build stackTrace=Error: Cannot cleanup: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                  Error #1 --------------------------------------------------------------------------------
Error: connect ETIMEDOUT 20.205.243.168:443
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
                                                                                                                                                                                                                                                                                                                                                                                                                                                  Error #2 --------------------------------------------------------------------------------
Error: connect ETIMEDOUT 20.205.243.168:443
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
    at throwError (B:\biomarkers\node_modules\builder-util\src\asyncTaskManager.ts:88:11)
    at checkErrors (B:\biomarkers\node_modules\builder-util\src\asyncTaskManager.ts:53:9)
    at AsyncTaskManager.awaitTasks (B:\biomarkers\node_modules\builder-util\src\asyncTaskManager.ts:67:7)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at PublishManager.awaitTasks (B:\biomarkers\node_modules\app-builder-lib\src\publish\PublishManager.ts:247:5)
    at executeFinally (B:\biomarkers\node_modules\builder-util\src\promise.ts:23:3)