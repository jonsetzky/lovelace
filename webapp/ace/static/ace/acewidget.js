// This object exists for the purpose of sending answer, currently
var acewidget = {

    read_editor_value: function (editor_id) {
        const content = ace.edit(editor_id).getValue()
        localStorage.setItem(editor_id + "-contents", content)
        return content
    },

    reset_editor: function (widget_slug) {
        console.log(widget_slug)
        const editor = ace.edit(widget_slug + "-ace-editor")
        localStorage.removeItem(widget_slug + "-ace-editor-contents")
        editor.setValue($("textarea#" + widget_slug + "-ace-initial").val())
    }

}

/**
 * Interface for the controller object passed to the preview widget.
 * @typedef {Object} AceWidgetController
 * @property {(input: string) => void} send_input Sends input to the websocket.
 */

/**
 * @typedef {Object} WSPreviewWidget
 * @property {(aceWidget: AceWidgetController) => void} init called on websocket begin
 * @property {(data: string, error?: string) => void} receive called on receive and error
 * @property {() => void} end Called when the websocket connection is closed due to "timeout" status or a successful "read" operation.
 * @property {(() => Record<string, any>) | undefined} getConfig
 * @property {(() => void) | undefined} preInit called right before connecting to websocket
 */

/**
 * This class is used when running with websockets
 * @implements {AceWidgetController}
 */
var AceWidget = class {


    constructor(addr, editor, preview, button_id, ticket_url) {
        this.ws = new WSWrapper(addr, ticket_url)
        this.editor = editor
        /**  @type {WSPreviewWidget} */
        this.preview = preview
        this.button = $("button#" + button_id)
        this.button.click((button) => this.connect_ws(button))
        this.running = false
    }

    connect_ws() {
        if (this.preview.preInit) {
            this.preview.preInit()
        }
        this.ws.connect(this)
    }

    begin() {
        this.preview.init(this)
        this.button.addClass("ace-button-running")
        this.button.prop("disabled", true)
        this.running = true
        const content = this.editor.getValue()
        localStorage.setItem(this.editor.container.id + "-contents", content)

        let msg = {
            "operation": "run",
            "content": content,
        }
        if (this.preview.getConfig) {
            msg["config"] = this.preview.getConfig()
        }
        this.ws.send(msg)
    }

    send_input(input) {
        if (this.running) {
            this.ws.send({
                "operation": "input",
                "input": input,
            })
        }
    }

    receive(data) {
        this.preview.receive(data)
    }

    /**
     * @param {string} msg 
     * @param {string|undefined} err 
     */
    error(msg, err) {
        if (this.running) {
            this.running = false

            if (err && this.preview.receive.length === 2) {
                return this.preview.receive(msg + "\n", err)
            }

            this.preview.receive(msg + "\n")
        }
    }

    end(status) {
        this.button.removeClass("ace-button-running")
        this.button.prop("disabled", false)
        this.preview.end()
        this.running = false
    }
}

