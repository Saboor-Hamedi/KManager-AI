one of the pdf did not uploaded...
this shows by default —
documents
·
—
chunks
·
—
and nothing happens there nothing shows
db:ingest-file error: error: invalid byte sequence for encoding "UTF8": 0x00
    at B:\biomarkers\node_modules\pg\lib\client.js:652:17
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async B:\biomarkers\out\main\index.js:267:28
    at async Database.transaction (B:\biomarkers\out\main\index.js:88:22)
    at async IngestionService.ingestFile (B:\biomarkers\out\main\index.js:265:12)
    at async B:\biomarkers\out\main\index.js:551:22
    at async Session.<anonymous> (node:electron/js2c/browser_init:2:112762) {
  length: 146,
  severity: 'ERROR',
  code: '22021',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: 'unnamed portal parameter $5',
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'mbutils.c',
  line: '1720',
  routine: 'report_invalid_encoding'
}