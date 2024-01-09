import { Plugin, TextFileView, WorkspaceLeaf, MarkdownView } from "obsidian";
import "./src/norg-parse.js";
import "./lib/codemirror.js";
import "./mode/simple/simple.js";

import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
} from "@codemirror/view";

import { vim } from "@replit/codemirror-vim";

CodeMirror.defineSimpleMode("neorg", {
    start: [
        { regex: /^\* .*$/, token: ["header-1", "header"], sol: true },
        { regex: /^\*\* .*/, token: ["header-2", "header"], sol: true },
        { regex: /^\*\*\* .*/, token: ["header-3", "header"], sol: true },

        { regex: /^\s*\~.*$/, token: ["list-item"], sol: true },

        { regex: "\/(.*?)\/", token: ["italic"] },
        { regex: /\*(.*?)\*/, token: ["bold"] },
        { regex: /`([^`]+)`/, token: ["inline-code"] },

        { regex: /^\s*- \( \)/, token: ["todo"], sol: true},

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
            
        });
    }

    newNeorgFile() {
        this.app.vault.create("untitled2.norg", "").then(file => this.app.workspace.getMostRecentLeaf()?.openFile(file));
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

        this.codeMirror.setCursor(0, 0);
    }

    // When the view is resized, refresh CodeMirror (thanks Licat!).
    onResize() {
        this.codeMirror.refresh();
    }

    changed = async () => {
        this.requestSave();
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
    };

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
