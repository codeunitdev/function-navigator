# 🧭 Functions Navigator

**Instantly browse, filter, and jump between functions** in your code — across **PHP**, **JavaScript**, **TypeScript**, and **Python** — all from a sleek tree view right inside the **VS Code Explorer**.

Make sense of large files in seconds. Save time. Stay in flow.

---

## ✨ Features

- 🗂️ **Explorer Integration** – View all functions in a structured tree sidebar
- ⚙️ **Multi-Language Support** – PHP, JavaScript, TypeScript, and Python
- ⚡ **One-Click Navigation** – Jump directly to any function with a click
- 🧩 **Lightweight & Fast** – Zero external dependencies

---

## 🖼️ Preview

> _Quickly jump to functions without unnecessary scrolling through files_

![Functions Navigator Screenshot](https://codeunitdev.github.io/function-navigator/screenshot.jpg)

---

## 💡 Why Developers Love It

> “Finally, a clean and fast way to see my project’s structure at a glance.”

- Makes refactoring large files painless
- Perfect for onboarding into unfamiliar codebases
- Keeps your workflow focused — no manual scrolling needed

---

## ⚙️ Commands

| Command                               | Description                               |
| ------------------------------------- | ----------------------------------------- |
| `Function Tree: Navigate to Function` | Open function tree and jump to a function |
| `Function Tree: Refresh`              | Refresh the current function list         |
| `Function Tree: Debug Tree`           | Log internal tree data for debugging      |

---

## 📁 File & Folder Management

Easily organize your project directly from the _Functions Navigator_ view.

---

### 📝 Creating Files or Folders

You can quickly create new _files_ or _folders_ within the _Explorer sidebar_:

1. _Right-click_ on the folder where you want to add a new item.
2. Choose either _“New File”_ or _“New Folder”_ from the context menu.
3. Enter a _name_ (for files, include the extension — e.g., index.js, app.py).
4. Press _Enter_ — your new item will appear instantly in the tree view.
   - If it’s a file, it will _open automatically_ in the editor.
   - If it’s a folder, it will expand right under the selected directory.

> 💡 _Tip:_ You can also create nested files by typing paths like components/Button.jsx directly.

_📸 Screenshot Example:_  
![Create File or Folder](docs/image.png)
![Enter file or folder name](docs/image-1.png)

---

## 🔧 Configuration

| Setting                       | Description                       | Default |
| ----------------------------- | --------------------------------- | ------- |
| `functionTree.enabled`        | Enable/disable function display   | `true`  |
| `functionTree.filterRegex`    | Regex to filter visible functions | `""`    |
| `functionTree.pythonMaxDepth` | Max nested depth for Python       | `5`     |

---

## 🚀 Installation

Install directly from the **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=CodeUnit-TL.function-tree)** or search for **“Functions Navigator”** inside VS Code.

```bash
ext install CodeUnit-TL.function-tree
```

---

## ⭐ Support the Project

If **Functions Navigator** makes your workflow smoother, please consider supporting it — it really helps!

- ⭐ [Leave a review on the Marketplace](https://marketplace.visualstudio.com/items?itemName=CodeUnit-TL.function-tree&ssr=false#review-details) — it really helps others discover it
- 🐙 [Star the project on GitHub](https://github.com/codeunitdev/function-navigator) _(GitHub repo)_ to show your support
- 💬 Share it with your teammates or community

Your feedback and encouragement keep the project improving. 🙌
