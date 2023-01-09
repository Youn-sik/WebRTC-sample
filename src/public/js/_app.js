const messageList = document.querySelector("ul")
const messageForm = document.querySelector("#msg")
const nicknameForm = document.querySelector("#nick")
const socket = new WebSocket(`ws://${window.location.host}`)

const makeMessage = (type, payload) => {
    const msg = {type, payload}
    return JSON.stringify(msg)
}

socket.addEventListener("open", () => {
    console.log("socket connected")
})
socket.addEventListener("message", (msg) => {
    const li = document.createElement("li")
    li.innerText = msg.data

    messageList.append(li)
})
socket.addEventListener("close", () => {
    console.log("socket closed")
})

messageForm.addEventListener("submit", (evt) => {
    evt.preventDefault()
    const input = messageForm.querySelector("input")
    
    socket.send(makeMessage("new_message", input.value))
    
    const li = document.createElement("li")
    li.innerText = `You: ${input.value}`

    messageList.append(li)

    input.value = ""
})

nicknameForm.addEventListener("submit", (evt) => {
    evt.preventDefault()
    const input = nicknameForm.querySelector("input")
    socket.send(makeMessage("nickname", input.value))
})