import http from 'http'
import fs from 'fs'
import { ipcMain } from 'electron'

export function setupPdfServer() {
  let pdfPort = 0
  
  const pdfServer = http.createServer((req, res) => {
    try {
      const filePath = decodeURIComponent(req.url.slice(1).split('#')[0])
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Access-Control-Allow-Origin', '*')
        fs.createReadStream(filePath).pipe(res)
      } else {
        res.statusCode = 404
        res.end('Not Found')
      }
    } catch (err) {
      res.statusCode = 500
      res.end('Error')
    }
  })

  pdfServer.listen(0, '127.0.0.1', () => {
    pdfPort = pdfServer.address().port
  })

  ipcMain.handle('get-pdf-port', () => {
    return pdfPort
  })
}
