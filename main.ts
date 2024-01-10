import { Plugin, TextFileView, WorkspaceLeaf, MarkdownView } from "obsidian";
import "./src/norg-parse.js";
import "./lib/codemirror.js";
import "./mode/simple/simple.js";
//import "./tree-sitter-norg-main/bindings/node/index.js";

import {
    WidgetType,
    DecorationSet
} from "@codemirror/view";

import CodeMirror from "./lib/codemirror.js";

CodeMirror.defineSimpleMode("neorg", {
    start: [
        { regex: /^\* .*$/, token: ["header-1", "header"], sol: true },
        { regex: /^\*\* .*/, token: ["header-2", "header"], sol: true },
        { regex: /^\*\*\* .*/, token: ["header-3", "header"], sol: true },
        { regex: /^\*\*\*\* .*/, token: ["header-4", "header"], sol: true },
        { regex: /^\*\*\*\*\* .*/, token: ["header-5", "header"], sol: true },

        { regex: /^\s*\~.*$/, token: ["list-item"], sol: true },

        { regex: "\/(.*?)\/", token: ["italic"] },
        { regex: /\*(.*?)\*/, token: ["bold"] },
        { regex: /`([^`]+)`/, token: ["inline-code"] },

        { regex: /^\s*- \( \)/, token: ["task todo"], sol: true },
        { regex: /^\s*- \(-\)/, token: ["task pending"], sol: true },
        { regex: /^\s*- \(x\)/, token: ["task done"], sol: true },

    ],

    env: [
        { regex: /\#\+(?:(END|end))_[a-zA-Z]*/, token: "comment", next: "start", sol: true },
        { regex: /.*/, token: "comment" }
    ]
});

export default class Neorg extends Plugin {
    async onload() {
        super.onload();
        console.log("Loading Neorg plugin ...");

        this.registerView("neorg", this.neorgViewCreator);
        this.registerExtensions(["norg"], "neorg");

        this.addRibbonIcon("plus", "New norg file", () => { 
			this.app.vault.create("untitled.norg", "").then(file => this.app.workspace.getMostRecentLeaf()?.openFile(file));
		});
    }

    newNeorgFile() {
    }

    neorgViewCreator = (leaf: WorkspaceLeaf) => {
        return new NeorgView(leaf);
    };

    onunload() {
        console.log("Unloading Neorg plugin ...");
    }
}

class NeorgView extends TextFileView {
    // Internal code mirror instance:
    codeMirror: CodeMirror.Editor;
    decorations: DecorationSet;

    // this.contentEl is not exposed, so cheat a bit.
    public get extContentEl(): HTMLElement {
        // @ts-ignore
        return this.contentEl;
    }

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        // @ts-ignore
        this.codeMirror = CodeMirror(this.extContentEl, {
            showCursorWhenSelecting: true,
        });

        this.codeMirror.on("changes", this.changed);

        //this.codeMirror.setCursor(0, 0);
    }

    // When the view is resized, refresh CodeMirror (thanks Licat!).
    onResize() {
        this.codeMirror.refresh();
        this.reloadButtons();
    }

    changed = async () => {
        this.requestSave();
        this.reloadButtons();
    };

    getViewData = () => {
        return this.codeMirror.getValue();
    };

    setViewData = (data: string, clear: boolean) => {
        if (clear) {
            // @ts-ignore
            this.codeMirror.swapDoc(CodeMirror.Doc(data, "neorg"));
        } else {
            this.codeMirror.setValue(data);
        }

        // @ts-ignore
        //if (this.app?.vault?.config?.vimMode) {
        //  this.codeMirror.setOption("keyMap", "vim");
        //}

        // This seems to fix some odd visual bugs:
        this.codeMirror.refresh();

        // This focuses the editor, which is analogous to the
        // default Markdown behavior in Obsidian:
        this.codeMirror.focus();

        this.reloadButtons();
    };

    reloadButtons () {
        const todoElements = this.contentEl.querySelectorAll('.task');

        // Remove each 'todo' element
        todoElements.forEach(todoElement => {
            todoElement.remove();
        });

        var rect = this.codeMirror.getWrapperElement().getBoundingClientRect();
        var topVisibleLine = this.codeMirror.lineAtHeight(rect.top, "window");
        var bottomVisibleLine = this.codeMirror.lineAtHeight(rect.bottom, "window");

        for (let i = topVisibleLine; i < bottomVisibleLine; i++) {
            let tokens = this.codeMirror.getLineTokens(i);
            for (let j = 0; j < tokens.length; j++) {
                if (tokens[j].type?.startsWith("task")) { this.todoButton(tokens[j], i); }
            }
        } 
    }

    todoButton(token, line) {
        let lines = this.contentEl.querySelector(".CodeMirror-lines");

        if (lines) {
            let button = lines.createEl("input");
            button.type = "checkbox";
            button.className = token.type;
            const coords = this.codeMirror.charCoords({ line: line, ch: token.start }, 'local');
            button.style.left = coords.left.toString() + "px";
            button.style.top = coords.top.toString() + "px";
            console.log(token.type);
            button.checked = token.type == "task done"; 
            
            let cm = this.codeMirror;
            button.addEventListener('change', () => {
                const newText = button.checked ? '- (x)' : '- ( )';
                this.codeMirror.replaceRange(newText, { line: line, ch: token.start }, { line: line, ch: token.end });
            });
        }
    }

    clear = () => {
        this.codeMirror.setValue("");
        this.codeMirror.clearHistory();
    };

    getDisplayText() {
        if (this.file) {
            return this.file.basename;
        } else {
            return "org (No File)";
        }
    }

    canAcceptExtension(extension: string) {
        return extension === "norg";
    }

    getViewType() {
        return "neorg";
    }
}

class CheckboxWidget extends WidgetType {
    constructor(readonly checked: boolean) { super() }

    eq(other: CheckboxWidget) { return other.checked == this.checked }

    toDOM() {
        let wrap = document.createElement("span")
        wrap.setAttribute("aria-hidden", "true")
        wrap.className = "cm-boolean-toggle"
        let box = wrap.appendChild(document.createElement("input"))
        box.type = "checkbox"
        box.checked = this.checked
        return wrap
    }

    ignoreEvent() { return false }
}

