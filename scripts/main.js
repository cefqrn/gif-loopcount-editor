import { setLoopCount } from "./gif.js"

const downloads = document.getElementById("downloads")
function createDownloadButton(data, filename) {
  const li = document.createElement("li")

  const closeButton = document.createElement("button")
  // add an icon that's invisible to screen readers
  // and a label that can only be read by a screen reader
  closeButton.innerHTML = `<span style="font-size: 0;">delete</span><span aria-hidden="true">x</span>`
  closeButton.name = "delete"
  closeButton.onclick = () => li.remove()
  li.appendChild(closeButton)

  const downloadButton = document.createElement("a")
  downloadButton.href = URL.createObjectURL(new Blob([data], {type: "image/gif"}))
  downloadButton.download = filename
  downloadButton.innerText = filename
  li.appendChild(downloadButton)

  downloads.appendChild(li)
}

function editFile(file, newLoopCount) {
  const reader = new FileReader
  reader.onload = () => {
    console.log(`started working on ${file.name}`)

    const data = new Uint8Array(reader.result)

    const newData = setLoopCount(data, newLoopCount)
    if (newData === undefined) {
      console.log(`couldn't parse ${file.name}`)
      alert(`invalid image: ${file.name}`)
      return
    }

    const newName = `${newLoopCount === -1 ? "inf" : newLoopCount}_${file.name}`
    createDownloadButton(newData, newName)

    console.log(`finished working on ${file.name}`)
  }

  reader.readAsArrayBuffer(file)
}

const goButton = document.getElementById("go-button")

// reenable go button
goButton.disabled = false
goButton.removeAttribute("title")

// remove javascript text warning
const javascriptWarning = document.getElementById("javascript-warning")
javascriptWarning.remove()

const loopCountInput = document.getElementById("loop-count")
const fileInput = document.getElementById("file-input")
goButton.onclick = function() {
  const newLoopCount = parseInt(loopCountInput.value)
  if (newLoopCount < -1 || 65535 < newLoopCount) {
    alert(`loop count must be between -1 and 65535 (inclusive)`)
    return
  }

  for (const file of fileInput.files) {
    editFile(file, newLoopCount)
  }
}

const clearButton = document.getElementById("clear-button")
clearButton.onclick = () => downloads.replaceChildren()

const downloadButton = document.getElementById("download-button")
downloadButton.onclick = function() {
  for (const link of downloads.getElementsByTagName("a")) {
    link.click()
  }
}
