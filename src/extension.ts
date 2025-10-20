import * as vscode from 'vscode';
import * as path from 'path';

interface LanguageParser {
  languageId: string;
  fileExtensions: string[];
  parse(content: string): { name: string; line: number }[];
}

class PhpParser implements LanguageParser {
  languageId = 'php';
  fileExtensions = ['php'];
  parse(content: string): { name: string; line: number }[] {
    console.log('Parsing PHP content:', content.substring(0, 100));
    const functionRegex = /function\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*\(/g;
    const functions: { name: string; line: number }[] = [];
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

class JsTsParser implements LanguageParser {
  languageId = 'javascript';
  fileExtensions = ['js', 'ts', 'jsx', 'tsx'];
  
  parse(content: string): { name: string; line: number }[] {
    console.log('Parsing JS/TS content:', content.substring(0, 100));

    const functions: { name: string; line: number }[] = [];

    // Match standard function declarations: function foo(...) {
    const functionDeclRegex = /\bfunction\s+([a-zA-Z_$][\w$]*)\s*\(/g;

    // Match arrow functions or function expressions: const foo = (...) => or const foo = function(...)
    const assignedFunctionRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\([^\)]*\)\s*=>)/g;

    // Match class methods: class X { methodName(...) { } }
    const classMethodRegex = /(?<=class\s+[A-Za-z_$][\w$]*[\s\S]*?){[\s\S]*?\b([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*{/g;

    const addMatches = (regex: RegExp) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const name = match[1];
        const index = match.index;
        const lineNumber = content.substring(0, index).split('\n').length - 1;
        if (name && !functions.some(f => f.name === name && f.line === lineNumber)) {
          functions.push({ name, line: lineNumber });
        }
      }
    };

    addMatches(functionDeclRegex);
    addMatches(assignedFunctionRegex);
    addMatches(classMethodRegex);

    console.log('Parsed functions:', JSON.stringify(functions));
    return functions;
  }
}

class PythonParser implements LanguageParser {
  languageId = 'python';
  fileExtensions = ['py', 'pyw'];

  parse(content: string): { name: string; line: number; parent?: string }[] {
    const config = vscode.workspace.getConfiguration('functionTree');
    const maxDepth = config.get<number>('pythonMaxDepth', 1);

    const lines = content.split('\n');
    const functions: { name: string; line: number; parent?: string }[] = [];
    const stack: { indent: number; depth: number; name?: string }[] = [];

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
      } else if (funcMatch) {
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
  private parsers: LanguageParser[] = [new PhpParser(), new JsTsParser(), new PythonParser()];
  getParser(languageId: string): LanguageParser | undefined {
    return this.parsers.find(parser => parser.languageId === languageId);
  }
  getSupportedExtensions(): string[] {
    const extensions = this.parsers.flatMap(parser => parser.fileExtensions);
    return extensions.length > 0 ? extensions : ['php'];
  }
  registerParser(parser: LanguageParser): void {
    this.parsers.push(parser);
  }
}

class FunctionTreeDataProvider implements vscode.TreeDataProvider<vscode.Uri> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.Uri | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private parserRegistry = new ParserRegistry();
  private config = vscode.workspace.getConfiguration('functionTree');

  refresh(element?: vscode.Uri): void {
    console.log('Refreshing Project + Functions tree for:', element?.fsPath || 'root');
    this._onDidChangeTreeData.fire(element);
  }

  async getTreeItem(element: vscode.Uri): Promise<vscode.TreeItem> {
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
        }
      };
    }

    // Directory node
    try {
      const stat = await vscode.workspace.fs.stat(element);
      if (stat.type === vscode.FileType.Directory) {
        return {
          label: path.basename(element.fsPath),
          resourceUri: element,
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          iconPath: vscode.ThemeIcon.Folder
        };
      }
    } catch (e) {
      console.error('Error checking stat for', element.fsPath, e);
    }

    // File node
    return {
      label: path.basename(element.fsPath),
      resourceUri: element,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      iconPath: vscode.ThemeIcon.File
    };
  }

  async getChildren(element?: vscode.Uri): Promise<vscode.Uri[]> {
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
    let stat: vscode.FileStat;
    try {
      stat = await vscode.workspace.fs.stat(element);
    } catch (e) {
      console.error('Cannot stat element', element.fsPath, e);
      return [];
    }

    // Directory: show subfolders + files
    if (stat.type === vscode.FileType.Directory) {
      let entries: [string, vscode.FileType][];
      try {
        entries = await vscode.workspace.fs.readDirectory(element);
      } catch (e) {
        console.error('Error reading directory', element.fsPath, e);
        return [];
      }

      // Sort: folders first, then files (alphabetically)
      entries.sort((a, b) => {
        if (a[1] === b[1]) return a[0].localeCompare(b[0]);
        return a[1] === vscode.FileType.Directory ? -1 : 1;
      });

      const children: vscode.Uri[] = entries.map(([name, _type]) =>
        vscode.Uri.joinPath(element, name)
      );

      return children;
    }

    // File: add functions under it
    const ext = path.extname(element.fsPath).toLowerCase().slice(1);
    const supported = this.parserRegistry.getSupportedExtensions();
    if (!supported.includes(ext)) return [];

    try {
      const document = await vscode.workspace.openTextDocument(element);
      const parser = this.parserRegistry.getParser(document.languageId);
      if (!parser) return [];

      let functions = parser.parse(document.getText());

      // Apply optional name filter
      const filterRegex = this.config.get('filterRegex', '');
      if (filterRegex) {
        try {
          const regex = new RegExp(filterRegex);
          functions = functions.filter(f => regex.test(f.name));
        } catch (err) {
          console.error('Invalid filter regex:', filterRegex, err);
        }
      }

      const functionUris = functions.map(func => {
        const uriString = `file://${element.fsPath.replace(/\\/g, '/')}` +
          `@${func.name}:${func.line}`;
        return vscode.Uri.parse(uriString);
      });

      return functionUris;
    } catch (e) {
      console.error('Error parsing file', element.fsPath, e);
      return [];
    }
  }
}


export function activate(context: vscode.ExtensionContext) {
  try {
    console.log('Function Tree extension activated');
    const parserRegistry = new ParserRegistry();
    const treeProvider = new FunctionTreeDataProvider();

    // Register TreeDataProvider for the Function Tree view
    context.subscriptions.push(
      vscode.window.createTreeView('functionTreeView', { treeDataProvider: treeProvider })
    );

    // Register FileDecorationProvider to mark PHP files with functions
    context.subscriptions.push(
      vscode.window.registerFileDecorationProvider({
        provideFileDecoration: async (uri: vscode.Uri) => {
          if (!(uri instanceof vscode.Uri) || !uri.fsPath || uri.fsPath === '\\') {
            console.log('Invalid URI for decoration:', JSON.stringify(uri));
            return undefined;
          }
          const ext = path.extname(uri.fsPath).toLowerCase().slice(1);
          if (parserRegistry.getSupportedExtensions().includes(ext)) {
            try {
              const document = await vscode.workspace.openTextDocument(uri);
              const parser = parserRegistry.getParser(document.languageId);
              if (parser && parser.parse(document.getText()).length > 0) {
                console.log('Decorating file with functions:', uri.fsPath);
                return {
                  badge: 'F',
                  tooltip: 'Contains functions',
                  propagate: false
                };
              }
              console.log('No functions in file:', uri.fsPath);
            } catch (e) {
              console.error('Error checking functions for decoration:', uri.fsPath, e);
            }
          }
          return undefined;
        }
      })
    );

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('functionTree.navigateToFunction', async (uri: vscode.Uri, line?: number) => {
        try {
          console.log('Navigating to:', uri.toString(), 'line:', line);
          const fileUri = uri.path.includes('@') ? vscode.Uri.file(uri.path.split('@')[0]) : uri;
          const document = await vscode.workspace.openTextDocument(fileUri);
          const editor = await vscode.window.showTextDocument(document);
          if (line !== undefined) {
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
          }
        } catch (error) {
          vscode.window.showErrorMessage('Error navigating to function');
          console.error(error);
        }
      }),
      vscode.commands.registerCommand('functionTree.refresh', () => {
        console.log('Refresh command triggered');
        treeProvider.refresh();
      }),
      vscode.commands.registerCommand('functionTree.debugTree', async () => {
        try {
          console.log('Debugging Function Tree');
          const rootItems = await treeProvider.getChildren();
          console.log('Root items:', rootItems.map(f => f.toString()));
          for (const item of rootItems) {
            try {
              const stat = await vscode.workspace.fs.stat(item);
              if (stat.type === vscode.FileType.Directory) {
                console.log('Directory:', item.fsPath);
                const children = await treeProvider.getChildren(item);
                console.log('Children for:', item.fsPath, children.map(c => c.toString()));
              } else {
                console.log('File:', item.fsPath);
                const children = await treeProvider.getChildren(item);
                console.log('Functions for:', item.fsPath, children.map(c => c.toString()));
              }
            } catch (e) {
              console.error('Error checking stat for:', item.fsPath, e);
            }
          }
          vscode.window.showInformationMessage('Function Tree debug info logged to console');
        } catch (error) {
          console.error('Error debugging tree:', error);
          vscode.window.showErrorMessage('Error debugging Function Tree');
        }
      })
    );

    // File watcher for supported extensions
    const extensions = parserRegistry.getSupportedExtensions();
    console.log('File watcher extensions:', extensions);
    if (extensions.length > 0) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        `**/*.{${extensions.join(',')}}`
      );
      watcher.onDidChange(uri => {
        console.log('File changed:', uri.fsPath);
        treeProvider.refresh(uri);
      });
      watcher.onDidCreate(uri => {
        console.log('File created:', uri.fsPath);
        treeProvider.refresh(uri);
      });
      watcher.onDidDelete(uri => {
        console.log('File deleted:', uri.fsPath);
        treeProvider.refresh();
      });
      context.subscriptions.push(watcher);
    }

    // Refresh on configuration or text document changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('functionTree')) {
          console.log('Configuration changed, refreshing');
          treeProvider.refresh();
        }
      }),
      vscode.workspace.onDidChangeTextDocument(e => {
        console.log('Text document changed:', e.document.uri.fsPath);
        treeProvider.refresh(e.document.uri);
      })
    );
  } catch (error) {
    console.error('Error activating Function Tree extension:', error);
    vscode.window.showErrorMessage('Error activating Function Tree extension');
  }
}

export function deactivate() {
  console.log('Function Tree extension deactivated');
}