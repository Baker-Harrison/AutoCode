import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { php } from "@codemirror/lang-php";
import { xml } from "@codemirror/lang-xml";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { r } from "@codemirror/legacy-modes/mode/r";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { clike } from "@codemirror/legacy-modes/mode/clike";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import type { Extension } from "@codemirror/state";

const shellLang = StreamLanguage.define(shell);
const dockerfileLang = StreamLanguage.define(dockerFile);
const rubyLang = StreamLanguage.define(ruby);
const luaLang = StreamLanguage.define(lua);
const rLang = StreamLanguage.define(r);
const swiftLang = StreamLanguage.define(swift);
const kotlinLang = StreamLanguage.define(clike({ name: "kotlin", keywords: { "abstract": "keyword", "annotation": "keyword", "as": "keyword", "base": "keyword", "by": "keyword", "catch": "keyword", "class": "keyword", "companion": "keyword", "constructor": "keyword", "continue": "keyword", "crossinline": "keyword", "data": "keyword", "do": "keyword", "dynamic": "keyword", "else": "keyword", "enum": "keyword", "external": "keyword", "final": "keyword", "finally": "keyword", "for": "keyword", "fun": "keyword", "if": "keyword", "in": "keyword", "inline": "keyword", "inner": "keyword", "interface": "keyword", "internal": "keyword", "is": "keyword", "it": "keyword", "lateinit": "keyword", "noinline": "keyword", "null": "keyword", "object": "keyword", "open": "keyword", "operator": "keyword", "out": "keyword", "override": "keyword", "package": "keyword", "private": "keyword", "protected": "keyword", "public": "keyword", "reified": "keyword", "return": "keyword", "sealed": "keyword", "short": "keyword", "static": "keyword", "super": "keyword", "suspend": "keyword", "switch": "keyword", "sync": "keyword", "this": "keyword", "throw": "keyword", "trait": "keyword", "try": "keyword", "typealias": "keyword", "typeof": "keyword", "val": "keyword", "var": "keyword", "vararg": "keyword", "when": "keyword", "where": "keyword", "while": "keyword" } }));
const scalaLang = StreamLanguage.define(clike({ name: "scala", keywords: { "abstract": "keyword", "annotation": "keyword", "case": "keyword", "class": "keyword", "def": "keyword", "do": "keyword", "else": "keyword", "extends": "keyword", "final": "keyword", "finally": "keyword", "for": "keyword", "forSome": "keyword", "if": "keyword", "implicit": "keyword", "import": "keyword", "lazy": "keyword", "match": "keyword", "new": "keyword", "null": "keyword", "object": "keyword", "override": "keyword", "package": "keyword", "private": "keyword", "protected": "keyword", "return": "keyword", "sealed": "keyword", "super": "keyword", "this": "keyword", "throw": "keyword", "trait": "keyword", "try": "keyword", "type": "keyword", "val": "keyword", "var": "keyword", "while": "keyword", "with": "keyword", "yield": "keyword" } }));
const cLang = StreamLanguage.define(clike({ name: "c", keywords: { "auto": "keyword", "break": "keyword", "case": "keyword", "char": "keyword", "const": "keyword", "continue": "keyword", "default": "keyword", "do": "keyword", "double": "keyword", "else": "keyword", "enum": "keyword", "extern": "keyword", "float": "keyword", "for": "keyword", "goto": "keyword", "if": "keyword", "int": "keyword", "long": "keyword", "register": "keyword", "return": "keyword", "short": "keyword", "signed": "keyword", "sizeof": "keyword", "static": "keyword", "struct": "keyword", "switch": "keyword", "typedef": "keyword", "union": "keyword", "unsigned": "keyword", "void": "keyword", "volatile": "keyword", "while": "keyword" } }));
const tomlLang = StreamLanguage.define(toml);

const languageMap: Record<string, Extension> = {
  '.js': javascript({ jsx: true }),
  '.jsx': javascript({ jsx: true }),
  '.ts': javascript({ jsx: true, typescript: true }),
  '.tsx': javascript({ jsx: true, typescript: true }),
  '.py': python(),
  '.rs': rust(),
  '.go': go(),
  '.html': html(),
  '.htm': html(),
  '.css': css(),
  '.scss': css(),
  '.less': css(),
  '.json': json(),
  '.jsonc': json(),
  '.md': markdown(),
  '.markdown': markdown(),
  '.sql': sql(),
  '.yaml': yaml(),
  '.yml': yaml(),
  '.sh': shellLang,
  '.bash': shellLang,
  '.zsh': shellLang,
  '.dockerfile': dockerfileLang,
  '.xml': xml(),
  '.svg': xml(),
  '.php': php(),
  '.java': java(),
  '.c': cLang,
  '.cpp': cpp(),
  '.h': cLang,
  '.hpp': cpp(),
  '.rb': rubyLang,
  '.lua': luaLang,
  '.r': rLang,
  '.swift': swiftLang,
  '.kt': kotlinLang,
  '.kts': kotlinLang,
  '.scala': scalaLang,
  '.toml': tomlLang,
};

const languageNames: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'React JSX',
  '.ts': 'TypeScript',
  '.tsx': 'React TSX',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.less': 'LESS',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.sql': 'SQL',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.sh': 'Shell',
  '.bash': 'Bash',
  '.zsh': 'Zsh',
  '.dockerfile': 'Dockerfile',
  '.xml': 'XML',
  '.svg': 'SVG',
  '.php': 'PHP',
  '.java': 'Java',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C Header',
  '.hpp': 'C++ Header',
  '.rb': 'Ruby',
  '.lua': 'Lua',
  '.r': 'R',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin Script',
  '.scala': 'Scala',
  '.toml': 'TOML',
};

export function getLanguageByPath(filename: string): Extension | null {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";
  return languageMap[ext] || null;
}

export function getLanguageName(filename: string): string {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";
  return languageNames[ext] || 'Plain Text';
}

export function detectLanguageFromContent(filename: string, content: string): Extension | null {
  const extLang = getLanguageByPath(filename);
  if (extLang) return extLang;

  const firstLine = (content.split('\n')[0] || '').trim();
  const shebangMatch = firstLine.match(/^#!(.*)/);
  if (shebangMatch) {
    const shebang = shebangMatch[1];
    if (shebang.includes('python') || shebang.includes('python3')) return python();
    if (shebang.includes('node')) return javascript();
    if (shebang.includes('bash') || shebang.includes('sh')) return shellLang;
    if (shebang.includes('ruby')) return rubyLang;
  }

  return null;
}

export function getAvailableLanguages(): Array<{ ext: string; name: string }> {
  return Object.entries(languageNames).map(([ext, name]) => ({ ext, name }));
}

export function getLanguageByExtension(ext: string): Extension | null {
  return languageMap[ext.toLowerCase()] || null;
}
