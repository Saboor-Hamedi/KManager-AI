
11:12:42.368 > Skip checkForUpdates because application is not packed and dev update config is not forced
11:12:42.574 > checkForUpdatesAndNotify called, downloadPromise is null
11:12:44 AM [vite] (client) Pre-transform error: B:\biomarkers\src\renderer\src\components\ChatBot.jsx: Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>? (56:2)

  54 |       </div>
  55 |     </div>
> 56 |   </div>
     |   ^
  57 | ))
  58 |
  59 | const UserMessage = memo(({ text }) => (
  Plugin: vite:react-babel
  File: B:/biomarkers/src/renderer/src/components/ChatBot.jsx:56:2
  54 |        </div>
  55 |      </div>
  56 |    </div>
     |    ^
  57 |  ))
  58 |  
11:12:47 AM [vite] Internal server error: B:\biomarkers\src\renderer\src\components\ChatBot.jsx: Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>? (56:2)

  54 |       </div>
  55 |     </div>
> 56 |   </div>
     |   ^
  57 | ))
  58 |
  59 | const UserMessage = memo(({ text }) => (
  Plugin: vite:react-babel
  File: B:/biomarkers/src/renderer/src/components/ChatBot.jsx:56:2
  54 |        </div>
  55 |      </div>
  56 |    </div>
     |    ^
  57 |  ))
  58 |  
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
      at JSXParserMixin.parseFunctionBody (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12093:24)
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
      at JSXParserMixin.allowInAnd (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12426:12)
      at JSXParserMixin.parseMaybeAssignAllowIn (B:\biomarkers\node_modules\@babel\parser\lib\index.js:10800:17)
      at JSXParserMixin.parseMaybeAssignAllowInOrVoidPattern (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12493:17)
      at JSXParserMixin.parseExprListItem (B:\biomarkers\node_modules\@babel\parser\lib\index.js:12175:18)
      at JSXParserMixin.parseCallExpressionArguments (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11252:22)
      at JSXParserMixin.parseCoverCallAndAsyncArrowHead (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11186:29)
      at JSXParserMixin.parseSubscript (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11120:19)
      at JSXParserMixin.parseSubscripts (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11094:19)
      at JSXParserMixin.parseExprSubscripts (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11085:17)
      at JSXParserMixin.parseUpdate (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11066:21)
      at JSXParserMixin.parseMaybeUnary (B:\biomarkers\node_modules\@babel\parser\lib\index.js:11046:23)
