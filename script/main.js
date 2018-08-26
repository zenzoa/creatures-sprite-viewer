const { h, render, Component } = preact

/* UTILITY FUNCTIONS */

const range = (count) => {
    return Array(count).fill().map((_, i) => i)
}

const combineBytes = (bytes) => {
    return bytes.reduce((prev, curr, i) => {
        return prev + (curr * Math.pow(256, i))
    }, 0)
}

fileHeaderFormat = [
    { label: 'numSprites', bytes: 2 }
]

imageHeaderFormat = [
    { label: 'offset', bytes: 4 },
    { label: 'width', bytes: 2 },
    { label: 'height', bytes: 2 }
]

const parseFromFormat = (format, data, nextByte = 0) => {
    let parsed = {}
    format.forEach(item => {
        const lastByte = nextByte + item.bytes
        parsed[item.label] = combineBytes(data.slice(nextByte, lastByte))
        nextByte = lastByte
    })
    parsed.nextByte = nextByte
    return parsed
}

const parseSprite = (data) => {
    const fileHeader = parseFromFormat(fileHeaderFormat, data)

    let nextByte = fileHeader.nextByte
    const imageHeaders = range(fileHeader.numSprites).map(i => {
        const imageHeader = parseFromFormat(imageHeaderFormat, data, nextByte)
        nextByte = imageHeader.nextByte
        return imageHeader
    })

    const spriteData = imageHeaders.map(({ offset, width, height }) => {
        const length = width * height
        const pixelData = data.slice(offset, offset + length)
        return { width, height, pixelData }
    })

    return spriteData
}

const getFileData = (event, callback) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.addEventListener('load', () => {

        const result = reader.result
        const header = 'data:application/octet-stream;base64,'
        const base64Data = result.slice(header.length)
        const binaryData = window.atob(base64Data)
        const binaryLength = binaryData.length

        let byteArray = new Uint8Array(new ArrayBuffer(binaryLength))
        for (let i = 0; i < binaryLength; i++) {
            byteArray[i] = binaryData.charCodeAt(i);
        }

        callback(byteArray)

    }, false)

    reader.readAsDataURL(file)
}

const drawPixel = (x, y, color, context) => {
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    context.fillRect(x, y, 1, 1)
}

/* COMPONENTS */

class SpriteFrame extends Component {

    componentDidMount() {
        this.updateCanvas()
    }

    componentDidUpdate() {
        this.updateCanvas()
    }

    updateCanvas() {
        if (!this.canvas) return

        const { width, height, pixelData } = this.props
        const context = this.canvas.getContext('2d')
        pixelData.forEach((pixel, i) => {
            const y = Math.floor(i / width)
            const x = i - (y * width)
            if (pixel !== 0) {
                const color = window.paletteData[pixel]
                drawPixel(x, y, color, context)
            }
        })
    }

    render({ width, height }) {
        return h('div', { className: 'sprite-frame' },
            h('canvas', { width, height, ref: node => { this.canvas = node } })
        )
    }

}

class SpriteFrameList extends Component {

    render({ spriteData }) {
        if (!spriteData) return null

        return h('div', { className: 'sprite-frame-list' },
            spriteData.map((sprite, i) => {
                return h(SpriteFrame, { key: i, ...sprite })
            })
        )
    }

}

class SpriteUploader extends Component {

    render({ onUpload }) {
        return h('div', { className: 'sprite-uploader' }, [
            h('label', null, [
                h('input', { type: 'file', onchange: onUpload }),
                h('span', null, 'Upload a SPR file')
            ])
        ])
    }

}

class SpriteViewer extends Component {

    constructor(props) {
        super(props)

        this.state = {
            spriteData: null
        }

        this.onUpload = this.onUpload.bind(this)
    }

    onUpload(event) {
        getFileData(event, data => {
            const spriteData = parseSprite(data)
            this.setState({ spriteData })
        })
    }

    render(props, { spriteData }) {
        return h('div', { className: 'sprite-viewer' }, [

            h('header', null, [
                h('h1', null, 'Creatures Sprite Viewer'),
                h('h2', null, 'Take a peak at sprites for ', h('a', { href: 'https://creatures.wiki/Creatures' }, 'Creatures 1'))
            ]),

            h(SpriteUploader, { onUpload: this.onUpload }),

            h(SpriteFrameList, { spriteData }),

            h('footer', null, [
                'by ', h('a', { href: 'https://zenzoa.com' }, 'Sarah Gould'), ' :: source on ', h('a', { href: 'https://github.com/sarahgould/' }, 'GitHub')
            ])

        ])
    }

}

/* SETUP */

window.onload = () => {

    render(
        h(SpriteViewer)
    , document.getElementsByTagName('main')[0])

}