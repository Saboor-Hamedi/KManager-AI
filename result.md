npm run dev

> biomarkers@1.0.0 dev
> electron-vite dev

vite v7.3.2 building ssr environment for development...
✓ 2 modules transformed.
out/main/index.js  3.72 kB
✓ built in 1.08s

electron main process built successfully

-----

vite v7.3.2 building ssr environment for development...
✓ 1 modules transformed.
out/preload/index.js  0.60 kB
✓ built in 48ms

electron preload scripts built successfully

-----

dev server running for the electron renderer process at:

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose

starting electron app...


9:16:30 PM [vite] Internal server error: B:\biomarkers\src\renderer\src\components\VisualAnalytics.jsx: Unexpected token (706:4)

  704 |
  705 |   if (activeTab === 'cm') {
> 706 |     const cm = metrics?.cm || [
      |     ^
  707 |       [0, 0],
  708 |       [0, 0]
  709 |     ]
  Plugin: vite:react-babel
  File: B:/biomarkers/src/renderer/src/components/VisualAnalytics.jsx:706:4
  718 |          <div className="flex flex-col items-center gap-4 py-10">
  719 |            <div className="flex gap-4 w-full max-w-[500px]">
  720 |  ...ex flex-col items-center justify-center rounded-xl shadow-inner">
      |                                                                 ^
  721 |                <span className="text-5xl font-black text-white">{cm[0][0]}</span>
  722 |                <span className="text-[10px] font-black text-blue-500 mt-2">
      at constructor (B:\biomarkers\node_modules\@babel\parser\lib\index.js:365:19)
      at JSXParserMixin.raise (B:\biomarkers\node_modules\@babel\parser\lib\index.js:6599:19)
      at JSXParserMixin.unexpected (B:\biomarkers\node_modules\@babel\parser\lib\index.js:6619:16)
      at JSXParserMixin.parseExprAtom (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11442:22)
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
      at JSXParserMixin.allowInAnd (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12426:12)
      at JSXParserMixin.parseExpression (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10780:17)
      at JSXParserMixin.jsxParseExpressionContainer (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4632:31)
      at JSXParserMixin.jsxParseElementAt (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4711:36)
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
9:16:30 PM [vite] (client) Pre-transform error: B:\biomarkers\src\renderer\src\components\VisualAnalytics.jsx: Unexpected token (706:4)
9:16:36 PM [vite] Internal server error: B:\biomarkers\src\renderer\src\components\VisualAnalytics.jsx: Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>? (1099:6)

  1097 |         )}
  1098 |       </AnalyticView>
> 1099 |       </div>
       |       ^
  1100 |
  1101 |       <div className={activeTab === 'importance' ? 'block' : 'hidden'}>
  1102 |         <AnalyticView
  Plugin: vite:react-babel
  File: B:/biomarkers/src/renderer/src/components/VisualAnalytics.jsx:1099:6
  1117 |                </div>
  1118 |                <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
  1119 |                  <div
       |              ^
  1120 |                    className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] transition-all duration-1000 r...
  1121 |                    style={{ width: `${value * 100}%` }}
      at constructor (B:\biomarkers\node_modules\@babel\parser\lib\index.js:365:19)
      at JSXParserMixin.raise (B:\biomarkers\node_modules\@babel\parser\lib\index.js:6599:19)
      at JSXParserMixin.jsxParseElementAt (B:\biomarkers\node_modules\@babel\parser\lib\index.js:4742:18)
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
      at B:\biomarkers\node_modules\@babel\parser\lib\index.js:10800:39
9:16:36 PM [vite] (client) Pre-transform error: B:\biomarkers\src\renderer\src\components\VisualAnalytics.jsx: Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>? (1099:6)

  1097 |         )}
  1098 |       </AnalyticView>
> 1099 |       </div>
       |       ^
  1100 |
  1101 |       <div className={activeTab === 'importance' ? 'block' : 'hidden'}>
  1102 |         <AnalyticView
  Plugin: vite:react-babel
  File: B:/biomarkers/src/renderer/src/components/VisualAnalytics.jsx:1099:6
  1117 |                </div>
  1118 |                <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
  1119 |                  <div
       |              ^
  1120 |                    className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] transition-all duration-1000 r...
  1121 |                    style={{ width: `${value * 100}%` }}