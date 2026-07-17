







9:15:28 AM [vite] Internal server error: B:\biomarkers\src\renderer\src\components\DocSidebar.jsx: Expected corresponding JSX closing tag for <div>. (117:24)

  115 |                           <FileText size={13} className={isActive ? 'text-[var(--text-accent)]' : 'text-[var(--text-faint)]'} />
  116 |                           <span className="truncate text-left">{doc.title}</span>
> 117 |                         </button>
      |                         ^
  118 |                       )
  119 |                     })}
  120 |                   </div>
  Plugin: vite:react-babel
  File: B:/biomarkers/src/renderer/src/components/DocSidebar.jsx:117:24
  115 |                            <FileText size={13} className={isActive ? 'text-[var(--text-accent)]' : 'text-[var(--text-f...
  116 |                            <span className="truncate text-left">{doc.title}</span>
  117 |                          </button>
      |                          ^
  118 |                        )
  119 |                      })}
      at constructor (B:\biomarkers\node_modules\@babel\parser\lib\index.js:365:19)
      at JSXParserMixin.raise (B:\biomarkers\node_modules\@babel\parser\lib\index.js:6599:19)
      at JSXParserMixin.jsxParseElementAt (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4727:16)
      at JSXParserMixin.jsxParseElementAt (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4698:32)
      at JSXParserMixin.jsxParseElement (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4749:17)
      at JSXParserMixin.parseExprAtom (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4759:19)
      at JSXParserMixin.parseExprSubscripts (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11081:23)
      at JSXParserMixin.parseUpdate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11066:21)
      at JSXParserMixin.parseMaybeUnary (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11046:23)
      at JSXParserMixin.parseMaybeUnaryOrPrivate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10899:61)
      at JSXParserMixin.parseExprOps (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10904:23)
      at JSXParserMixin.parseMaybeConditional (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10881:23)
      at JSXParserMixin.parseMaybeAssign (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10831:21)
      at B:\biomarkers\node_modules\@babel\parser\lib\index.js:10800:39
      at JSXParserMixin.allowInAnd (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12426:12)
      at JSXParserMixin.parseMaybeAssignAllowIn (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10800:17)
      at JSXParserMixin.parseMaybeAssignAllowInOrVoidPattern (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12493:17)
      at JSXParserMixin.parseParenAndDistinguishExpression (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11675:28)
      at JSXParserMixin.parseExprAtom (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11331:23)
      at JSXParserMixin.parseExprAtom (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4764:20)
      at JSXParserMixin.parseExprSubscripts (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11081:23)
      at JSXParserMixin.parseUpdate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11066:21)
      at JSXParserMixin.parseMaybeUnary (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11046:23)
      at JSXParserMixin.parseMaybeUnaryOrPrivate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10899:61)
      at JSXParserMixin.parseExprOps (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10904:23)
      at JSXParserMixin.parseMaybeConditional (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10881:23)
      at JSXParserMixin.parseMaybeAssign (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10831:21)
      at JSXParserMixin.parseExpressionBase (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10784:23)
      at B:\biomarkers\node_modules\@babel\parser\lib\index.js:10780:39
      at JSXParserMixin.allowInAnd (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12421:16)
      at JSXParserMixin.parseExpression (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10780:17)
      at JSXParserMixin.parseReturnStatement (B:\biomarkers\node_modules\@babel\parser\lib\index.js:13142:28)
      at JSXParserMixin.parseStatementContent (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12798:21)
      at JSXParserMixin.parseStatementLike (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12767:17)
      at JSXParserMixin.parseStatementListItem (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12747:17)
      at JSXParserMixin.parseBlockOrModuleBlockBody (B:\biomarkers\node_modules\@babel\parser\lib\index.js:13316:61)
      at JSXParserMixin.parseBlockBody (B:\biomarkers\node_modules\@babel\parser\lib\index.js:13309:10)
      at JSXParserMixin.parseBlock (B:\biomarkers\node_modules\@babel\parser\lib\index.js:13297:10)
      at JSXParserMixin.parseFunctionBody (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12100:24)
      at JSXParserMixin.parseArrowExpression (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12075:10)
      at JSXParserMixin.parseParenAndDistinguishExpression (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11687:12)
      at JSXParserMixin.parseExprAtom (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11331:23)
      at JSXParserMixin.parseExprAtom (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4764:20)
      at JSXParserMixin.parseExprSubscripts (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11081:23)
      at JSXParserMixin.parseUpdate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11066:21)
      at JSXParserMixin.parseMaybeUnary (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11046:23)
      at JSXParserMixin.parseMaybeUnaryOrPrivate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10899:61)
      at JSXParserMixin.parseExprOps (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10904:23)
      at JSXParserMixin.parseMaybeConditional (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10881:23)
      at JSXParserMixin.parseMaybeAssign (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10831:21)
