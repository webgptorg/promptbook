/**
 * The Monaco build of the desktop workspace: the editor API with the contributions a text and Book editor needs, and
 * Markdown tokenization. Monaco's bundled programming languages (and their language workers) are left out.
 */
export * from '../node_modules/monaco-editor/esm/vs/editor/editor.api.js';
import '../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css';
import '../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon-modifiers.css';
import '../node_modules/monaco-editor/esm/vs/editor/browser/coreCommands.js';
import '../node_modules/monaco-editor/esm/vs/editor/browser/widget/codeEditor/codeEditorWidget.js';
import '../node_modules/monaco-editor/esm/vs/editor/browser/widget/diffEditor/diffEditor.contribution.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/caretOperations/browser/caretOperations.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo.js';
import '../node_modules/monaco-editor/esm/vs/features/find/register.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/find/browser/findController.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/gotoError/browser/gotoError.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/gotoError/browser/markerSelectionStatus.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/gotoSymbol/browser/goToCommands.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/gotoSymbol/browser/link/goToDefinitionAtPosition.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/lineSelection/browser/lineSelection.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/links/browser/links.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/longLinesHelper/browser/longLinesHelper.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/readOnlyMessage/browser/contribution.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/smartSelect/browser/smartSelect.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/unicodeHighlighter/browser/unicodeHighlighter.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/unusualLineTerminators/browser/unusualLineTerminators.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import '../node_modules/monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js';
import '../node_modules/monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js';
import '../node_modules/monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js';
import '../node_modules/monaco-editor/esm/vs/editor/common/standaloneStrings.js';
import '../node_modules/monaco-editor/esm/vs/languages/definitions/markdown/register.js';
