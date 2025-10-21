# Changelog

## [1.3.6] – 2025-10-21
- Bundled with `esbuild` for faster runtime and smaller size.  
- Local VSIX testing workflow added before publishing.  
- Fixed bundling issues with Vue SFC compiler dependencies.  
- Optimized extension build for improved performance and reduced bundle size.

## [1.3.5] – 2025-10-21  
### 🧩 Updated
- Added screenshot JPG to showcase Functions Navigator in action

### 🚀 Major Update
- **Full AST-based parsing** with TypeScript compiler API for more accurate and faster function detection.
- **Added Vue `<script>` and `<script setup>` block parsing** using `@vue/compiler-sfc`.
- **Added Svelte `<script>` parsing** with correct line mapping.
- **Improved line accuracy** for TypeScript and JSX/TSX files.
- **Enhanced resilience**: automatic regex fallback for invalid syntax or missing compilers.
- **Introduced caching and debounce** for smoother performance on large projects.
- **Added configurable settings**:
  - `functionTree.debounceMs`
  - `functionTree.maxCacheEntries`
- **Offline-ready**: ships with all required compilers; no internet needed.
- **Optimized packaging**: smaller `.vsix`, faster activation.

### ✨ Added  
- **Full support for Vue (`.vue`) and Svelte (`.svelte`) files**  
  - Accurately detects and lists functions from `<script>` and `<script setup>` blocks  
  - Works seamlessly with both TypeScript and JavaScript  
  - Supports nested functions, class methods, and arrow functions  

### 🧠 Improved  
- **Complete rewrite of the core AST parser** for smarter, faster, and more reliable function detection  
  - Uses the TypeScript compiler API for precise code structure analysis  
  - Maintains correct parent–child hierarchy for methods and nested functions  
  - Accurately aligns cursor navigation to the **exact function definition line** in all file types  
- Enhanced **line mapping** and offset handling for embedded script blocks (Vue/Svelte)  
- Improved fallback mechanisms — automatically switches to regex parsing if framework compilers are unavailable  

### ⚙️ Optimized  
- Introduced **segmented parsing** for improved performance on large files  
- Smarter error handling — parsing errors in one section no longer interrupt the entire file scan  
- Cleaned and refactored TypeScript logic to remove all compiler warnings and ensure long-term maintainability  

### 🧩 Configuration  
- Added new customizable settings:  
  - `functionTree.debounceMs` → control update delay for live parsing  
  - `functionTree.maxCacheEntries` → limit number of cached analyses for performance  

### 🪄 Polished  
- Refined console logs and internal naming consistency  
- Improved fallback messaging for Vue/Svelte parsing  
- Deduplicated tree entries to ensure a clean, accurate function list  

## [1.3.3] – 2025-10-20
### 🧩 Updated
- Updated GitHub repository links in README and package.json
- Minor metadata refinements

## [1.3.2] – 2025-10-19
### 🖼️ Added
- Added demo GIF to showcase Functions Navigator in action

## [1.3.1] – 2025-10-18
### 🧩 Improved
- Enhanced **extension metadata** for better Marketplace discoverability (added keywords, refined description, improved categories)
- Updated **welcome message** to include all supported languages (PHP, JavaScript, TypeScript, Python)
- Polished **README** with improved visuals, examples, and support section
- Added **GitHub repository link** and optimized configuration details
- Minor UX refinements in labels and documentation

### 💡 Note
This update focuses on presentation, clarity, and discoverability — no code-breaking changes.  
If you enjoy using *Functions Navigator*, please consider leaving a ⭐ review on the Marketplace!