"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
/**
 * 🧭 Functions Navigator – VS Code Extension
 * -----------------------------------------------------
 * Instantly browse, filter, and jump between functions in your code.
 * This is the main activation file — it wires up the Function Tree view,
 * registers commands, and connects to language parsers.
 *
 * Built with ❤️ by CodeUnit TL
 *
 * @author CodeUnit TL
 * @license MIT
 * @version 1.3.7
 * @updated 2025-10-22
 * @website https://codeunit.org
 * @repository https://github.com/codeunitdev/function-navigator
 * @see https://marketplace.visualstudio.com/items?itemName=CodeUnit-TL.function-tree
 */
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class PhpParser {
    constructor() {
        this.languageId = 'php';
        this.fileExtensions = ['php'];
    }
    parse(content) {
        console.log('Parsing PHP content:', content.substring(0, 100));
        const functionRegex = /function\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*\(/g;
        const functions = [];
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1];
            const index = match.index;
            const lineNumber = content.substring(0, index).split('\n').length - 1;
            functions.push({ name: functionName, line: lineNumber });
        }
        console.log('Parsed functions:', JSON.stringify(functions));
        return functions;
    }
}
class JsTsParser {
    constructor() {
        this.languageId = 'javascript';
        this.fileExtensions = ['js', 'ts', 'jsx', 'tsx', 'vue', 'mjs', 'cjs', 'svelte'];
    }
    getTS() {
        if (!this._ts) {
            try {
                this._ts = require('typescript');
            }
            catch (e) {
                console.warn('TypeScript parser not available (lazy):', e?.message || e);
                this._ts = undefined;
            }
        }
        return this._ts;
    }
    getVueSfc() {
        if (!this._vueSfc) {
            try {
                this._vueSfc = require('@vue/compiler-sfc');
            }
            catch (e) {
                // not fatal; fallback to regex-based script extraction
                this._vueSfc = undefined;
            }
        }
        return this._vueSfc;
    }
    getSvelte() {
        if (!this._svelte) {
            try {
                this._svelte = require('svelte/compiler');
            }
            catch (e) {
                this._svelte = undefined;
            }
        }
        return this._svelte;
    }
    parse(content) {
        console.log('Parsing JS/TS content:', content.substring(0, 100));
        // normalize
        const original = content.replace(/\r\n|\r/g, '\n').replace(/^\uFEFF/, '');
        // Try AST-based parse if TypeScript is available
        const ts = this.getTS();
        if (ts) {
            try {
                return this.parseWithAst(original, ts);
            }
            catch (err) {
                console.error('AST parse failed, falling back to regex parser:', err);
                try {
                    return this.parseWithRegex(original);
                }
                catch (err2) {
                    console.error('Regex fallback also failed:', err2);
                    return [];
                }
            }
        }
        // No ts available -> regex fallback
        return this.parseWithRegex(original);
    }
    // --- AST-based parsing using TypeScript (and optional Vue/Svelte extractors) ---
    parseWithAst(original, ts) {
        // segments: { text, baseOffset, baseLine } where baseOffset is index in original
        const segments = [];
        // Try Vue SFC extraction if present and compiler available
        const vueSfc = this.getVueSfc();
        if (vueSfc && /<script\b/i.test(original)) {
            try {
                const parsed = vueSfc.parse(original);
                // collect script and scriptSetup blocks if present
                const blocks = [];
                if (parsed.descriptor.script)
                    blocks.push(parsed.descriptor.script);
                if (parsed.descriptor.scriptSetup)
                    blocks.push(parsed.descriptor.scriptSetup);
                for (const b of blocks) {
                    const startOffset = b.loc.start.offset; // requires compiler-sfc, safe inside try
                    const beforeText = original.slice(0, startOffset);
                    const baseLine = beforeText.split('\n').length; // 1-based baseLine
                    segments.push({ text: b.content, baseOffset: startOffset, baseLine });
                }
            }
            catch (e) {
                // fallback to regex extraction below
            }
        }
        // Svelte extraction (if compiler present)
        const svelte = this.getSvelte();
        if (svelte && /<script\b/i.test(original)) {
            try {
                const parsed = svelte.parse(original);
                // svelte parse nodes: instance and module may be present
                const addNode = (node) => {
                    if (!node)
                        return;
                    // node.start/ node.end are offsets; but in some versions, node.content may exist
                    const start = node.start ?? null;
                    const end = node.end ?? null;
                    if (start != null && end != null) {
                        const beforeText = original.slice(0, start);
                        const baseLine = beforeText.split('\n').length;
                        const text = original.slice(start, end);
                        segments.push({ text, baseOffset: start, baseLine });
                    }
                };
                addNode(parsed.instance);
                addNode(parsed.module);
            }
            catch (e) {
                // ignore, fallback later
            }
        }
        // If no segments collected by compilers, fall back to simple <script> regex extraction
        if (segments.length === 0 && /<script\b/i.test(original)) {
            const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
            let m;
            while ((m = scriptRegex.exec(original)) !== null) {
                const inner = m[1];
                // absolute start of inner content:
                const absStart = m.index + m[0].indexOf(inner);
                const baseLine = original.slice(0, absStart).split('\n').length;
                segments.push({ text: inner, baseOffset: absStart, baseLine });
            }
        }
        // If still nothing, parse whole file as one segment
        if (segments.length === 0) {
            segments.push({ text: original, baseOffset: 0, baseLine: 0 });
        }
        const collected = [];
        // Helper: create SourceFile. Heuristic filename decides scriptKind (TSX if JSX-like)
        const guessFileName = (text) => {
            // quick heuristic: presence of JSX tags likely means TSX/JSX
            if (/\<[A-Za-z][\s\S]*\>/.test(text) && /return\s*\(/.test(text))
                return 'file.tsx';
            return 'file.ts';
        };
        const scriptKindFromName = (fileName) => {
            return fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
        };
        // visitor that collects nodes of interest
        for (const seg of segments) {
            const fileNameHint = guessFileName(seg.text);
            const sf = ts.createSourceFile(fileNameHint, seg.text, ts.ScriptTarget.Latest, true, scriptKindFromName(fileNameHint));
            const baseOffset = seg.baseOffset; // absolute index in original
            const baseLine = seg.baseLine; // 1-based
            const getLine1 = (posInSeg) => {
                const pos = posInSeg;
                const lc = sf.getLineAndCharacterOfPosition(pos);
                // sf.getLine... returns {line: 0-based ...}
                return baseLine + lc.line; // 1-based line in original content
            };
            const getLine = (posInSeg) => {
                const pos = posInSeg;
                const lc = sf.getLineAndCharacterOfPosition(pos);
                // 🧩 Correction: embedded <script> segments (e.g., in .svelte or .vue) often shift lines by +1
                const isEmbedded = /<script/i.test(original);
                const correction = isEmbedded ? 1 : 0;
                // sf.getLine... returns {line: 0-based ...}
                return baseLine + lc.line - correction; // 1-based line in original content
            };
            const visit = (node, parentNameStack) => {
                try {
                    // FunctionDeclaration
                    if (ts.isFunctionDeclaration(node) && node.name && node.name.text) {
                        const name = node.name.text;
                        const line = getLine(node.getStart());
                        collected.push({ name, line, type: 'function', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node });
                    }
                    // VariableStatement -> ArrowFunction / FunctionExpression or hook assignment
                    if (ts.isVariableStatement(node)) {
                        for (const decl of node.declarationList.declarations) {
                            if (ts.isIdentifier(decl.name) && decl.initializer) {
                                const id = decl.name.text;
                                const init = decl.initializer;
                                if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
                                    const line = getLine(node.getStart());
                                    collected.push({ name: id, line, type: 'function', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node: decl });
                                }
                                else if (ts.isCallExpression(init) && ts.isIdentifier(init.expression) && /^use[A-Z]/.test(init.expression.text)) {
                                    // const x = useCallback(...)
                                    const line = getLine(node.getStart());
                                    collected.push({ name: id, line, type: 'function', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node: decl });
                                }
                            }
                        }
                    }
                    // ClassDeclaration
                    if (ts.isClassDeclaration(node) && node.name && node.name.text) {
                        const name = node.name.text;
                        const line = getLine(node.getStart());
                        collected.push({ name, line, type: 'class', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node });
                    }
                    // MethodDeclaration inside class
                    if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
                        const name = node.name.text;
                        const line = getLine(node.getStart());
                        // parent class name if available
                        const parentClass = parentNameStack.length ? parentNameStack[parentNameStack.length - 1] : undefined;
                        collected.push({ name, line, parent: parentClass, type: 'function', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node });
                    }
                    // PropertyDeclaration with arrow initializer (class property arrow)
                    if (ts.isPropertyDeclaration?.(node) && node.name && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
                        const name = node.name.text;
                        const line = getLine(node.getStart());
                        const parentClass = parentNameStack.length ? parentNameStack[parentNameStack.length - 1] : undefined;
                        collected.push({ name, line, parent: parentClass, type: 'function', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node });
                    }
                    // InterfaceDeclaration
                    if (ts.isInterfaceDeclaration(node) && node.name && node.name.text) {
                        const name = node.name.text;
                        const line = getLine(node.getStart());
                        collected.push({ name, line, type: 'interface', absStart: baseOffset + node.getStart(), absEnd: baseOffset + node.getEnd(), node });
                    }
                }
                catch (e) {
                    // ignore node-specific errors but continue traversal
                }
                // manage parent class names stack
                let pushed = false;
                if (ts.isClassDeclaration(node) && node.name && node.name.text) {
                    parentNameStack.push(node.name.text);
                    pushed = true;
                }
                node.forEachChild((child) => visit(child, parentNameStack));
                if (pushed)
                    parentNameStack.pop();
            };
            visit(sf, []);
        }
        // Derive parents by enclosure (closest enclosing collected item)
        collected.sort((a, b) => a.absStart - b.absStart || b.absEnd - a.absEnd);
        const resultsMap = [];
        for (const it of collected) {
            // find candidates that enclose it
            const candidates = collected.filter((c) => c !== it && c.absStart <= it.absStart && c.absEnd >= it.absEnd);
            let parentName = it.parent;
            if (!parentName && candidates.length > 0) {
                candidates.sort((a, b) => b.absStart - a.absStart);
                parentName = candidates[0].name;
            }
            resultsMap.push({ name: it.name, line: it.line, parent: parentName, type: it.type });
        }
        // Deduplicate
        const dedup = [];
        for (const r of resultsMap) {
            if (!dedup.find((d) => d.name === r.name && d.line === r.line && d.parent === r.parent))
                dedup.push(r);
        }
        // Return in expected shape (structural typing means extra fields are fine)
        return dedup;
    }
    // --- Robust regex fallback (keeps your prior behavior) ---
    // This is adapted from your current implementation (keeps behavior stable).
    parseWithRegex(content) {
        // This implementation intentionally mirrors your previous regex logic
        try {
            // Normalize
            const normalized = content.replace(/\r\n|\r/g, '\n').replace(/^\uFEFF/, '');
            // Extract <script> blocks to avoid template noise, but keep positions naive (we rely on regex fallback so lines may differ slightly)
            const scriptMatches = [];
            const scriptBlockRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
            let scriptMatch;
            while ((scriptMatch = scriptBlockRegex.exec(normalized)) !== null) {
                scriptMatches.push(scriptMatch[1]);
            }
            const parseSource = scriptMatches.length > 0 ? scriptMatches.join('\n') : normalized;
            // stripper (replace contents with spaces to preserve indices when possible)
            const stripper = (s) => s
                .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
                .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length))
                .replace(/`(?:\\[\s\S]|[^\\`])*`/g, (m) => ' '.repeat(m.length))
                .replace(/'(?:\\.|[^'\\])*'/g, (m) => ' '.repeat(m.length))
                .replace(/"(?:\\.|[^"\\])*"/g, (m) => ' '.repeat(m.length));
            const src = stripper(parseSource);
            const rx = (r) => new RegExp(r.source, r.flags);
            const functionDeclRegex = rx(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^({;]+)?\s*{/g);
            const assignedFunctionRegex = rx(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+?)?\s*=\s*(?:async\s*)?(?:function\b\s*\([^)]*\)|\([^)]*\)\s*(?::\s*[^=]+?)?\s*=>)/g);
            const classDeclRegex = rx(/\bclass\s+([A-Za-z_$][\w$]*)\s*(?:extends\s+[A-Za-z_$][\w$]*\s*)?(?:implements\s+[A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)?\s*{/g);
            const interfaceRegex = rx(/\binterface\s+([A-Za-z_$][\w$]*)\s*{/g);
            const classMethodRegex = rx(/\b(?:(?:public|private|protected|static|async)\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^({;]+)?\s*{/g);
            const classPropertyArrowRegex = rx(/([A-Za-z_$][\w$]*)\s*(?:[:<][^=]*)?=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{/g);
            const reactHookCallRegex = rx(/\b(use(?:Effect|Callback|Memo|LayoutEffect|Reducer|State))\s*\(/g);
            const constHookAssignRegex = rx(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(use(?:Callback|Effect|Memo|LayoutEffect|Reducer|State))\s*\(/g);
            const items = [];
            const findBlockEnd = (s, braceIndex) => {
                if (braceIndex < 0 || braceIndex >= s.length)
                    return s.length;
                let depth = 0;
                for (let i = braceIndex; i < s.length; i++) {
                    const ch = s[i];
                    if (ch === '{')
                        depth++;
                    else if (ch === '}') {
                        depth--;
                        if (depth === 0)
                            return i + 1;
                    }
                }
                return s.length;
            };
            const pushItem = (name, start, end, type) => {
                const lineNumber = src.substring(0, start).split('\n').length;
                if (!items.find((it) => it.name === name && it.line === lineNumber && it.type === type)) {
                    items.push({ name, line: lineNumber, type, start, end });
                }
            };
            const addMatches = (pattern, type) => {
                const r = rx(pattern);
                let m;
                while ((m = r.exec(src)) !== null) {
                    const name = m[1];
                    const start = m.index;
                    const braceIndex = src.indexOf('{', start + m[0].length - 1);
                    const end = braceIndex >= 0 ? findBlockEnd(src, braceIndex) : start + m[0].length;
                    pushItem(name, start, end, type);
                }
            };
            addMatches(classDeclRegex, 'class');
            addMatches(interfaceRegex, 'interface');
            addMatches(functionDeclRegex, 'function');
            addMatches(assignedFunctionRegex, 'function');
            for (const cls of items.filter((i) => i.type === 'class')) {
                const bodyStart = cls.start;
                const bodyEnd = cls.end;
                const body = src.slice(bodyStart, bodyEnd);
                const r = rx(classMethodRegex);
                let m;
                while ((m = r.exec(body)) !== null) {
                    const methodName = m[1];
                    const methodStart = bodyStart + m.index;
                    const braceIndex = src.indexOf('{', methodStart + m[0].length - 1);
                    const methodEnd = braceIndex >= 0 ? findBlockEnd(src, braceIndex) : methodStart + m[0].length;
                    pushItem(methodName, methodStart, methodEnd, 'function');
                }
                const rp = rx(classPropertyArrowRegex);
                while ((m = rp.exec(body)) !== null) {
                    const propName = m[1];
                    const propStart = bodyStart + m.index;
                    const braceIndex = src.indexOf('{', propStart + m[0].length - 1);
                    const propEnd = braceIndex >= 0 ? findBlockEnd(src, braceIndex) : propStart + m[0].length;
                    pushItem(propName, propStart, propEnd, 'function');
                }
            }
            // hooks
            for (const seg of [src]) {
                let mh;
                const rh = rx(constHookAssignRegex);
                while ((mh = rh.exec(seg)) !== null) {
                    const name = mh[1];
                    const start = mh.index;
                    pushItem(name, start, start + mh[0].length, 'function');
                }
                const rc = rx(reactHookCallRegex);
                while ((mh = rc.exec(seg)) !== null) {
                    const name = mh[1];
                    const start = mh.index;
                    pushItem(name, start, start + mh[0].length, 'function');
                }
            }
            // assign parents by enclosure (closest)
            items.sort((a, b) => a.start - b.start || b.end - a.end);
            for (const item of items) {
                const candidates = items.filter((cand) => cand !== item && cand.start <= item.start && cand.end >= item.end);
                if (candidates.length === 0) {
                    item.parent = undefined;
                    continue;
                }
                candidates.sort((a, b) => b.start - a.start);
                const chosen = candidates[0];
                item.parent = (chosen.type === 'function' || chosen.type === 'class') ? chosen.name : undefined;
            }
            const result = items.map(({ name, line }) => ({ name, line }));
            return result;
        }
        catch (e) {
            console.error('Regex parser error:', e);
            return [];
        }
    }
}
class PythonParser {
    constructor() {
        this.languageId = 'python';
        this.fileExtensions = ['py', 'pyw'];
    }
    parse(content) {
        const config = vscode.workspace.getConfiguration('functionTree');
        const maxDepth = config.get('pythonMaxDepth', 1);
        const lines = content.split('\n');
        const functions = [];
        const stack = [];
        const functionRegex = /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
        const classRegex = /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*[:\(]/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const indent = line.match(/^\s*/)?.[0].length || 0;
            while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }
            const currentDepth = stack.length > 0 ? stack[stack.length - 1].depth + 1 : 0;
            const classMatch = classRegex.exec(line);
            const funcMatch = functionRegex.exec(line);
            if (classMatch) {
                stack.push({ indent, depth: currentDepth, name: classMatch[1] });
            }
            else if (funcMatch) {
                const funcName = funcMatch[1];
                const parent = stack.length > 0 ? stack[stack.length - 1].name : undefined;
                if (currentDepth <= maxDepth) {
                    functions.push({ name: funcName, line: i, parent });
                }
                stack.push({ indent, depth: currentDepth, name: funcName });
            }
        }
        console.log('Parsed Python functions (nested):', JSON.stringify(functions, null, 2));
        return functions;
    }
}
class ParserRegistry {
    constructor() {
        this.parsers = [new PhpParser(), new JsTsParser(), new PythonParser()];
    }
    getParser(languageId) {
        // Direct match
        if (languageId === 'javascript' || languageId === 'typescript') {
            return this.parsers.find(parser => parser.languageId === 'javascript');
        }
        // --- Vue integration ---
        if (languageId === 'vue') {
            const jsParser = this.parsers.find(parser => parser.languageId === 'javascript');
            if (jsParser)
                return jsParser;
        }
        // --- Fallback aliases (React/Svelte, etc.) ---
        const aliasMap = {
            typescriptreact: 'javascript',
            javascriptreact: 'javascript',
            svelte: 'javascript',
        };
        const mapped = aliasMap[languageId];
        if (mapped) {
            return this.parsers.find(parser => parser.languageId === mapped);
        }
        // Default direct lookup
        return this.parsers.find(parser => parser.languageId === languageId);
    }
    getSupportedExtensions() {
        const extensions = this.parsers.flatMap(parser => parser.fileExtensions);
        return extensions.length > 0 ? extensions : ['php'];
    }
    registerParser(parser) {
        this.parsers.push(parser);
    }
}
class FunctionTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.parserRegistry = new ParserRegistry();
        // --- runtime config (backed by settings) ---
        //private config = vscode.workspace.getConfiguration('functionTree');
        //private config: vscode.WorkspaceConfiguration & FunctionTreeConfig = vscode.workspace.getConfiguration('functionTree');
        this.config = vscode.workspace.getConfiguration('functionTree');
        this.debounceMs = 250;
        this.maxCacheEntries = 500;
        // --- Caching + debounce internals ---
        // cache keyed by document URI -> { version, functions }
        // Use Map to maintain insertion order for LRU eviction (oldest = first key).
        this.parseCache = new Map();
        // debounce timers keyed by document URI
        this.debounceTimers = new Map();
        // load initial settings
        this.reloadSettings();
    }
    /**
     * Public: reload settings from workspace config.
     * Call when configuration changes so runtime reflects new values.
     */
    reloadSettings() {
        try {
            this.config = vscode.workspace.getConfiguration('functionTree');
            const cfgDebounce = Number(this.config.debounceMs ?? this.debounceMs);
            const cfgCache = Number(this.config.maxCacheEntries ?? this.maxCacheEntries);
            // enforce sensible bounds
            this.debounceMs = Math.max(25, Math.min(5000, isFinite(cfgDebounce) ? cfgDebounce : this.debounceMs));
            this.maxCacheEntries = Math.max(10, Math.min(20000, isFinite(cfgCache) ? cfgCache : this.maxCacheEntries));
            console.log(`functionTree: reloadSettings -> debounceMs=${this.debounceMs}, maxCacheEntries=${this.maxCacheEntries}`);
            // If cache limit reduced, prune immediately
            this.enforceCacheLimit();
        }
        catch (err) {
            console.warn('functionTree: failed to reload settings, keeping previous values', err);
        }
    }
    /** Enforce LRU limit on parseCache; evict oldest entries when over limit. */
    enforceCacheLimit() {
        try {
            while (this.parseCache.size > this.maxCacheEntries) {
                // Map.prototype.keys() iteration order = insertion order -> first() is LRU
                const oldestKey = this.parseCache.keys().next().value;
                if (!oldestKey)
                    break;
                this.parseCache.delete(oldestKey);
                console.log(`functionTree: LRU evicted cache entry ${oldestKey}`);
            }
        }
        catch (err) {
            console.warn('functionTree: enforceCacheLimit error', err);
        }
    }
    /** Utility: mark cache key as recently used (move to end) */
    touchCacheKey(key) {
        const v = this.parseCache.get(key);
        if (!v)
            return;
        // re-insert to move it to the end (most-recently-used)
        this.parseCache.delete(key);
        this.parseCache.set(key, v);
    }
    refresh(element) {
        // simple wrapper, kept for backward compatibility
        console.log('Refreshing Project + Functions tree for:', element?.fsPath || 'root');
        this._onDidChangeTreeData.fire(element);
    }
    // Schedule a debounced refresh for a document (called from onDidChangeTextDocument)
    scheduleRefreshForDocument(document) {
        const key = document.uri.toString();
        // If version didn't change and we have a cached result, no heavy parse required
        const cached = this.parseCache.get(key);
        if (cached && cached.version === document.version) {
            // quick refresh only
            this.touchCacheKey(key);
            this.refresh(document.uri);
            return;
        }
        // Clear existing timer
        const existing = this.debounceTimers.get(key);
        if (existing)
            clearTimeout(existing);
        const t = setTimeout(() => {
            this.debounceTimers.delete(key);
            try {
                // When timer fires, refresh the tree for that document (getChildren will re-parse if needed)
                this.refresh(document.uri);
            }
            catch (err) {
                console.error('Error during scheduled refresh:', err);
            }
        }, this.debounceMs);
        this.debounceTimers.set(key, t);
    }
    // Called when a document is closed - removes cache and pending timers
    handleDocumentClosed(document) {
        const key = document.uri.toString();
        if (this.parseCache.delete(key)) {
            console.log('Cleared parse cache for closed document:', document.uri.fsPath);
        }
        const timer = this.debounceTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(key);
        }
    }
    // Internal: parse a document but use cache when version matches
    async parseDocument(document) {
        const key = document.uri.toString();
        const cached = this.parseCache.get(key);
        if (cached && cached.version === document.version) {
            // Move to MRU
            this.touchCacheKey(key);
            return cached.functions;
        }
        const parser = this.parserRegistry.getParser(document.languageId);
        let functions = [];
        if (!parser) {
            // no parser for this language — cache empty result
            try {
                this.parseCache.set(key, { version: document.version, functions: [] });
            }
            catch { }
            this.enforceCacheLimit();
            return [];
        }
        try {
            // parse (parser.parse may be sync)
            const raw = parser.parse(document.getText());
            // normalize result (ensure shape)
            functions = Array.isArray(raw)
                ? raw.map(r => ({ name: r.name, line: r.line, parent: r.parent, type: r.type }))
                : [];
        }
        catch (err) {
            // defensive logging; keep going with empty result
            console.error(`Error parsing document ${document.uri.fsPath}:`, err?.message ?? err);
            functions = [];
        }
        // cache parse result (and move to MRU)
        try {
            if (this.parseCache.has(key))
                this.parseCache.delete(key);
            this.parseCache.set(key, { version: document.version, functions });
            this.enforceCacheLimit();
        }
        catch (err) {
            console.warn('Failed to set parse cache:', err);
        }
        return functions;
    }
    async getTreeItem(element) {
        if (!(element instanceof vscode.Uri) || !element.fsPath) {
            return { label: 'Invalid Item', collapsibleState: vscode.TreeItemCollapsibleState.None };
        }
        const pathStr = element.path;
        // Function node (has @functionName:lineNumber)
        if (pathStr.includes('@')) {
            const [filePath, funcInfo] = pathStr.split('@');
            const [funcName, lineStr] = funcInfo.split(':');
            const line = parseInt(lineStr, 10);
            return {
                label: funcName,
                resourceUri: element,
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                iconPath: new vscode.ThemeIcon('symbol-function'),
                command: {
                    command: 'functionTree.navigateToFunction',
                    title: 'Go to Function',
                    arguments: [vscode.Uri.file(filePath), line]
                },
                contextValue: 'function' // 👈 add this
            };
        }
        // Directory node
        try {
            const stat = await vscode.workspace.fs.stat(element);
            if (stat.type === vscode.FileType.Directory) {
                // ✅ NEW: detect if this is a workspace root
                const workspaceRoots = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? [];
                const isRoot = workspaceRoots.some(root => element.fsPath === root);
                return {
                    label: path.basename(element.fsPath),
                    resourceUri: element,
                    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                    iconPath: vscode.ThemeIcon.Folder,
                    contextValue: isRoot ? 'rootFolder' : 'folder', // 👈 distinct context for root
                    //contextValue: 'folder' // 👈 add this
                    //description: isRoot ? 'Workspace Root' : undefined // optional visual cue
                };
            }
        }
        catch (e) {
            console.error('Error checking stat for', element.fsPath, e);
        }
        // File node
        // Determine if file has functions
        let functions = [];
        try {
            const ext = path.extname(element.fsPath).toLowerCase().slice(1);
            const supported = this.parserRegistry.getSupportedExtensions();
            if (supported.includes(ext)) {
                const document = await vscode.workspace.openTextDocument(element);
                functions = await this.parseDocument(document);
            }
        }
        catch (e) {
            console.error('Error checking functions for file:', element.fsPath, e);
        }
        const hasChildren = functions.length > 0;
        return {
            label: path.basename(element.fsPath),
            resourceUri: element,
            collapsibleState: hasChildren
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
            iconPath: vscode.ThemeIcon.File,
            command: {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [element]
            },
            contextValue: 'file' // 👈 add this
        };
    }
    async getChildren(element) {
        if (!this.config.get('enabled', true)) {
            console.log('Function Tree disabled in settings');
            return [];
        }
        // Root: workspace folders
        if (!element) {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders || folders.length === 0) {
                console.log('No workspace folders found');
                return [];
            }
            const roots = folders.map(f => f.uri);
            console.log('Workspace roots:', roots.map(r => r.fsPath));
            return roots;
        }
        // Get stats for this element
        let stat;
        try {
            stat = await vscode.workspace.fs.stat(element);
        }
        catch (e) {
            console.error('Cannot stat element', element.fsPath, e);
            return [];
        }
        // Directory: show subfolders + files
        if (stat.type === vscode.FileType.Directory) {
            let entries;
            try {
                entries = await vscode.workspace.fs.readDirectory(element);
            }
            catch (e) {
                console.error('Error reading directory', element.fsPath, e);
                return [];
            }
            // Sort: folders first, then files (alphabetically)
            entries.sort((a, b) => {
                if (a[1] === b[1])
                    return a[0].localeCompare(b[0]);
                return a[1] === vscode.FileType.Directory ? -1 : 1;
            });
            const children = entries.map(([name, _type]) => vscode.Uri.joinPath(element, name));
            return children;
        }
        // File: add functions under it
        const ext = path.extname(element.fsPath).toLowerCase().slice(1);
        const supported = this.parserRegistry.getSupportedExtensions();
        if (!supported.includes(ext))
            return [];
        try {
            const document = await vscode.workspace.openTextDocument(element);
            // Use the caching parse helper
            const functions = await this.parseDocument(document);
            // Apply optional name filter
            let filtered = functions;
            const filterRegex = this.config.get('filterRegex', '');
            if (filterRegex) {
                try {
                    const regex = new RegExp(filterRegex);
                    filtered = filtered.filter(f => regex.test(f.name));
                }
                catch (err) {
                    console.error('Invalid filter regex:', filterRegex, err);
                }
            }
            const functionUris = filtered.map(func => {
                const uriString = `file://${element.fsPath.replace(/\\/g, '/')}` +
                    `@${func.name}:${func.line}`;
                return vscode.Uri.parse(uriString);
            });
            //return functionUris;
            // 🟢 NEW: return [] if there are no functions, to hide toggle (>)
            return functionUris.length > 0 ? functionUris : [];
        }
        catch (e) {
            console.error('Error parsing file', element.fsPath, e);
            return [];
        }
    }
}
function activate(context) {
    try {
        console.log('Function Tree extension activated');
        const parserRegistry = new ParserRegistry();
        const treeProvider = new FunctionTreeDataProvider();
        treeProvider.reloadSettings?.(); // Ensure settings initialized
        // Register TreeDataProvider
        context.subscriptions.push(vscode.window.createTreeView('functionTreeView', { treeDataProvider: treeProvider }));
        // 🟢 Handle root expand refresh only
        const treeView = vscode.window.createTreeView('functionTreeView', { treeDataProvider: treeProvider });
        context.subscriptions.push(treeView);
        treeView.onDidExpandElement(e => {
            const roots = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? [];
            if (roots.includes(e.element.fsPath)) {
                console.log('[FunctionTree] Root expanded → refreshing:', e.element.fsPath);
                treeProvider.refresh(e.element);
            }
        });
        // Register FileDecorationProvider
        context.subscriptions.push(vscode.window.registerFileDecorationProvider({
            provideFileDecoration: async (uri) => {
                try {
                    if (!(uri instanceof vscode.Uri) || !uri.fsPath || uri.fsPath === '\\')
                        return undefined;
                    const ext = path.extname(uri.fsPath).toLowerCase().slice(1);
                    if (!parserRegistry.getSupportedExtensions().includes(ext))
                        return undefined;
                    const document = await vscode.workspace.openTextDocument(uri);
                    const parser = parserRegistry.getParser(document.languageId);
                    if (parser && parser.parse(document.getText()).length > 0) {
                        return { badge: 'F', tooltip: 'Contains functions', propagate: false };
                    }
                }
                catch (e) {
                    console.error('Decoration error:', e);
                }
                return undefined;
            }
        }));
        // Commands
        context.subscriptions.push(vscode.commands.registerCommand('functionTree.navigateToFunction', async (uri, line) => {
            try {
                const fileUri = uri.path.includes('@') ? vscode.Uri.file(uri.path.split('@')[0]) : uri;
                const document = await vscode.workspace.openTextDocument(fileUri);
                const editor = await vscode.window.showTextDocument(document);
                if (line !== undefined) {
                    const pos = new vscode.Position(line, 0);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(new vscode.Range(pos, pos));
                }
            }
            catch (err) {
                vscode.window.showErrorMessage('Error navigating to function');
                console.error(err);
            }
        }), vscode.commands.registerCommand('functionTree.refresh', () => {
            console.log('Manual refresh command triggered');
            treeProvider.refresh();
        }), vscode.commands.registerCommand('functionTree.debugTree', async () => {
            try {
                console.log('Debugging Function Tree');
                const roots = await treeProvider.getChildren();
                console.log('Root items:', roots.map(r => r.fsPath));
                vscode.window.showInformationMessage('Function Tree debug info logged to console');
            }
            catch (err) {
                console.error('Error debugging tree:', err);
                vscode.window.showErrorMessage('Error debugging Function Tree');
            }
        }), 
        // ✅ custom delete command
        vscode.commands.registerCommand('functionTree.deleteFile', async (uri) => {
            const isDir = (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
            const confirm = await vscode.window.showWarningMessage(`Are you sure you want to delete ${isDir ? 'folder' : 'file'} "${path.basename(uri.fsPath)}"${isDir ? ' and all its contents?' : '?'}`, { modal: true }, 'Yes', 'Cancel');
            if (confirm !== 'Yes') {
                vscode.window.showInformationMessage('Deletion cancelled.');
                return;
            }
            try {
                await vscode.workspace.fs.delete(uri, { recursive: isDir });
                vscode.window.showInformationMessage(`Deleted ${isDir ? 'folder' : 'file'}: ${uri.fsPath}`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Failed to delete: ${uri.fsPath}`);
                console.error(err);
            }
        }), 
        /* vscode.commands.registerCommand('functionTree.deleteFile', async (uri: vscode.Uri) => {
           try {
             await vscode.workspace.fs.delete(uri, { recursive: false });
             vscode.window.showInformationMessage(`Deleted: ${uri.fsPath}`);
           } catch (err) {
             vscode.window.showErrorMessage(`Failed to delete: ${uri.fsPath}`);
             console.error(err);
           }
         }),*/
        /*vscode.commands.registerCommand('functionTree.deleteFile', async (uri: vscode.Uri) => {
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete "${path.basename(uri.fsPath)}"?`,
          { modal: true },
          'Yes', 'Cancel'
        );
      
        if (confirm !== 'Yes') {
          vscode.window.showInformationMessage('File deletion cancelled.');
          return;
        }
      
        try {
          await vscode.workspace.fs.delete(uri, { recursive: false });
          vscode.window.showInformationMessage(`Deleted: ${uri.fsPath}`);
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to delete: ${uri.fsPath}`);
          console.error(err);
        }
        }),*/
        // ✅ custom rename command
        /*vscode.commands.registerCommand('functionTree.renameFile', async (uri: vscode.Uri) => {
          const newName = await vscode.window.showInputBox({
            prompt: 'Enter new file name',
            value: path.basename(uri.fsPath)
          });
          if (!newName) return;
          const newUri = vscode.Uri.joinPath(vscode.Uri.file(path.dirname(uri.fsPath)), newName);
          try {
            await vscode.workspace.fs.rename(uri, newUri);
            vscode.window.showInformationMessage(`Renamed to: ${newName}`);
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to rename: ${uri.fsPath}`);
            console.error(err);
          }
        })*/
        vscode.commands.registerCommand('functionTree.renameFile', async (uri) => {
            const isDir = (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
            const oldName = path.basename(uri.fsPath);
            const newName = await vscode.window.showInputBox({
                prompt: `Enter new ${isDir ? 'folder' : 'file'} name`,
                value: oldName,
                validateInput: (value) => {
                    if (!value.trim())
                        return 'Name cannot be empty';
                    if (value.includes('/') || value.includes('\\'))
                        return 'Name cannot contain path separators';
                    return null;
                }
            });
            if (!newName || newName === oldName) {
                vscode.window.showInformationMessage('Rename cancelled.');
                return;
            }
            const newUri = vscode.Uri.joinPath(vscode.Uri.file(path.dirname(uri.fsPath)), newName);
            // Confirm rename
            const confirm = await vscode.window.showInformationMessage(`Rename ${isDir ? 'folder' : 'file'} "${oldName}" → "${newName}"?`, { modal: true }, 'Yes', 'Cancel');
            if (confirm !== 'Yes') {
                vscode.window.showInformationMessage('Rename cancelled.');
                return;
            }
            try {
                await vscode.workspace.fs.rename(uri, newUri, { overwrite: false });
                vscode.window.showInformationMessage(`Renamed ${isDir ? 'folder' : 'file'} to: ${newName}`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Failed to rename: ${uri.fsPath}`);
                console.error(err);
            }
        }), 
        // ✅ Improved New File
        vscode.commands.registerCommand('functionTree.newFile', async (uri) => {
            try {
                // Handle missing uri (root-level right-click)
                if (!uri) {
                    const folders = vscode.workspace.workspaceFolders;
                    if (!folders || folders.length === 0) {
                        vscode.window.showErrorMessage('No workspace folder found.');
                        return;
                    }
                    uri = folders[0].uri;
                }
                let baseDir = uri;
                //VS Code’s vscode.workspace.fs.stat() returns a Thenable, not a full Promise, so it doesn’t technically have .catch() on its type (even though it works at runtime).
                //const stat = await vscode.workspace.fs.stat(uri).catch(() => null);
                let stat = null;
                try {
                    stat = await vscode.workspace.fs.stat(uri);
                }
                catch (err) {
                    console.warn('Could not stat URI', uri.fsPath, err);
                }
                if (stat && stat.type !== vscode.FileType.Directory) {
                    baseDir = vscode.Uri.file(path.dirname(uri.fsPath));
                }
                const fileName = await vscode.window.showInputBox({
                    prompt: 'Enter new file name',
                    placeHolder: 'example.js',
                    validateInput: (value) => {
                        if (!value.trim())
                            return 'File name cannot be empty';
                        if (value.includes('/') || value.includes('\\'))
                            return 'Invalid file name';
                        return null;
                    },
                });
                if (!fileName)
                    return;
                const newFileUri = vscode.Uri.joinPath(baseDir, fileName);
                try {
                    await vscode.workspace.fs.stat(newFileUri);
                    vscode.window.showErrorMessage('File already exists.');
                    return;
                }
                catch { }
                await vscode.workspace.fs.writeFile(newFileUri, new TextEncoder().encode(''));
                const doc = await vscode.workspace.openTextDocument(newFileUri);
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`Created file: ${fileName}`);
            }
            catch (err) {
                console.error('Error creating file:', err);
                vscode.window.showErrorMessage('Failed to create file.');
            }
        }), 
        // ✅ Improved New Folder
        vscode.commands.registerCommand('functionTree.newFolder', async (uri) => {
            try {
                // Handle missing uri (root-level right-click)
                if (!uri) {
                    const folders = vscode.workspace.workspaceFolders;
                    if (!folders || folders.length === 0) {
                        vscode.window.showErrorMessage('No workspace folder found.');
                        return;
                    }
                    uri = folders[0].uri;
                }
                let baseDir = uri;
                //VS Code’s vscode.workspace.fs.stat() returns a Thenable, not a full Promise, so it doesn’t technically have .catch() on its type (even though it works at runtime).
                //const stat = await vscode.workspace.fs.stat(uri).catch(() => null);
                let stat = null;
                try {
                    stat = await vscode.workspace.fs.stat(uri);
                }
                catch (err) {
                    console.warn('Could not stat URI', uri.fsPath, err);
                }
                if (stat && stat.type !== vscode.FileType.Directory) {
                    baseDir = vscode.Uri.file(path.dirname(uri.fsPath));
                }
                const folderName = await vscode.window.showInputBox({
                    prompt: 'Enter new folder name',
                    placeHolder: 'new-folder',
                    validateInput: (value) => {
                        if (!value.trim())
                            return 'Folder name cannot be empty';
                        if (value.includes('/') || value.includes('\\'))
                            return 'Invalid folder name';
                        return null;
                    },
                });
                if (!folderName)
                    return;
                const newFolderUri = vscode.Uri.joinPath(baseDir, folderName);
                try {
                    await vscode.workspace.fs.stat(newFolderUri);
                    vscode.window.showErrorMessage('Folder already exists.');
                    return;
                }
                catch { }
                await vscode.workspace.fs.createDirectory(newFolderUri);
                vscode.window.showInformationMessage(`Created folder: ${folderName}`);
            }
            catch (err) {
                console.error('Error creating folder:', err);
                vscode.window.showErrorMessage('Failed to create folder.');
            }
        })); //subscription end
        // Watcher for supported extensions
        const extensions = parserRegistry.getSupportedExtensions();
        if (extensions.length > 0) {
            const watcher = vscode.workspace.createFileSystemWatcher(`**/*.{${extensions.join(',')}}`);
            watcher.onDidChange(uri => treeProvider.refresh(uri));
            watcher.onDidCreate(uri => treeProvider.refresh(uri));
            watcher.onDidDelete(() => treeProvider.refresh());
            context.subscriptions.push(watcher);
        }
        // Config + Document change listeners
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('functionTree')) {
                console.log('[FunctionTree] Configuration changed → reloading settings');
                treeProvider.reloadSettings?.();
                treeProvider.refresh();
            }
        }), vscode.workspace.onDidChangeTextDocument(e => {
            try {
                if (e?.document)
                    treeProvider.scheduleRefreshForDocument(e.document);
            }
            catch (err) {
                console.error('Error scheduling refresh:', err);
            }
        }), vscode.workspace.onDidCloseTextDocument(doc => {
            try {
                treeProvider.handleDocumentClosed(doc);
            }
            catch (err) {
                console.error('Error handling closed document:', err);
            }
        }));
    }
    catch (err) {
        console.error('Error activating Function Tree:', err);
        vscode.window.showErrorMessage('Error activating Function Tree extension');
    }
}
function deactivate() {
    console.log('Function Tree extension deactivated');
}
//# sourceMappingURL=extension1.js.map