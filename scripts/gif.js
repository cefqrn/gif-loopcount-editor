function byteToHex(d) {
  return d.toString(16).padStart(2, '0')
}

function encodeLoopCount(loopCount) {
  // -1 is infinite looping and is encoded as 0x0000 in the netscape extension
  return loopCount === -1 ? [0x00, 0x00] : [loopCount &  0xff, loopCount >> 8]
}

function createLoopingExtension(loopCount) {
  return [
    // application extension of length 11
    0x21, 0xff, 0x0b,
    // identifier (NETSCAPE)
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45,
    // auth code (2.0)
    0x32, 0x2e, 0x30,
    // sub-block of size 3
    0x03,
    // sub-block type [netscape sub-block-specific] (looping)
    0x01,
    // loop count [little-endian]
    ...encodeLoopCount(loopCount),
    // sub-block of size 0 = block terminator
    0x00
  ]
}

//export function setLoopCount(data, newLoopCount) {
export function setLoopCount(data, newLoopCount) {
  // skip the header
  let i = 13

  // if there's a global color table, skip it
  const packedFields = data[10]
  if (packedFields & 0x80) {
    const tableSize = packedFields & 0x07
    const tableByteCount = 3 * 2**(tableSize + 1)

    i += tableByteCount
  }

  // where to insert the extension if it doesn't already exist
  const insertionIndex = i

  // go through the gif till we find the netscape looping extension
  while (true) {
    const blockIndex = i

    const introducer = data[i++]
    if (introducer === 0x21) {
      // extension

      // can't set block size here because comments don't have a block size
      let blockSize

      const label = data[i++]
      switch (label) {
      case 0xff:  // application extension
        blockSize = data[i++]

        const decoder = new TextDecoder
        const identifier = decoder.decode(data.subarray(i, i+8))
        const authCode = decoder.decode(data.subarray(i+8, i+11))

        i += blockSize

        if (identifier === "NETSCAPE" && authCode === "2.0") {
          let subblockSize, loopCount
          while (subblockSize = data[i++]) {
            if (data[i] === 0x01) {
              if (!newLoopCount) {
                // if we don't want to loop, remove the entire extension
                const beforeLoop = data.subarray(0, blockIndex)
                const afterLoop = data.subarray(i+4)

                const newData = new Uint8Array(beforeLoop.length + afterLoop.length)
                newData.set(beforeLoop)
                newData.set(afterLoop, beforeLoop.length)

                return newData
              }

              // the loop count is stored as a 16-bit unsigned integer in little endian
              loopCount = (data[i+2] << 8) + data[i+1]
              console.log("loop count:", loopCount !== 0 ? loopCount : "inf")

              const newData = new Uint8Array(data)
              newData.set(encodeLoopCount(newLoopCount), i+1)

              return newData
            }

            i += subblockSize
          }

          continue
        }

        break

      case 0xf9:  // graphic control extension
      case 0x01:  // plain text extension
        blockSize = data[i++]
        i += blockSize

      case 0xfe:  // comment extension
        break

      default:  // unknown extension
        console.log(`unknown label (${byteToHex(label)}), aborting`)
        return undefined
      }
    } else if (introducer === 0x2c) {
      // image descriptor

      // if there's a local color table, skip it
      const packedFields = data[i + 8]
      if (packedFields & 0x80) {
        const tableSize = packedFields & 0x07
        const tableByteCount = 3 * 2**(tableSize + 1)

        i += tableByteCount
      }

      i += 10
    } else if (introducer === 0x3b) {
      // end of stream
      console.log("successfully reached end of file")
      break
    } else {
      // unknown block
      console.log(`unknown block (${byteToHex(introducer)}), aborting`)
      return undefined
    }

    // skip sub-blocks
    let length
    while (length = data[i++])
      i += length
  }

  // if there's no extension then we create our own if it's needed

  console.log("loop count: 0 (netscape extension missing)")

  if (newLoopCount === 0)
    return data

  console.log("creating netscape extension")
  const extension = createLoopingExtension(newLoopCount)

  const newData = new Uint8Array(data.length + extension.length)
  newData.set(data.subarray(0, insertionIndex))
  newData.set(extension, insertionIndex)
  newData.set(data.subarray(insertionIndex), insertionIndex + extension.length)

  return newData
}
