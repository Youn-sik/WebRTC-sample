const socket = io()

const welcome = document.getElementById("welcome")
const roomNameForm = welcome.querySelector("#roomName")
const room = document.getElementById("room")
const nameForm = welcome.querySelector("#name")

nameForm.addEventListener("submit", handleNicknameSubmit)
room.hidden = true

let roomName

function showRoom() {
    welcome.hidden = true
    room.hidden = false

    const h3 = room.querySelector("h3")
    h3.innerText = `Room: ${roomName}`

    const msgForm = room.querySelector("#msg")
    msgForm.addEventListener("submit", handleMessageSubmit)
}

function handleMessageSubmit(event) {
    event.preventDefault()

    const input = room.querySelector("#msg input")
    
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`you: ${input.value}`)
        input.value = ""
    })
}

function handleNicknameSubmit(event) {
    event.preventDefault()

    const input = welcome.querySelector("#name input")

    socket.emit("nickname", input.value)
}

function addMessage(message) {
    const ul = room.querySelector("ul")
    const li = document.createElement("li")

    li.innerText = message
    ul.appendChild(li)
}

roomNameForm.addEventListener("submit", (event) => {
    event.preventDefault()

    const input = roomNameForm.querySelector("#roomName input")

    // 마지막 인자로 콜백을 전달 해 줄 수 있다.
    // 해당 callback 은 frontend 에서 실행 된다.
    // ++ callback 뿐만 아니라 아무 매개변수나 계속 넣을 수 있다.
    /*
    ex)
    socker.emit("enter_room", {}, true, false, 5, 1000, "stringText", ..., () => {})
    */
    socket.emit("enter_room", input.value, showRoom)
    roomName = input.value
    input.value = ""
})

socket.on("welcome", (nickname, newCount) => {
    const h3 = room.querySelector("h3")
    h3.innerText = `Room: ${roomName} (${newCount})`

    addMessage(`-- ${nickname} -- join`)
})
socket.on("bye", (nickname, newCount) => {
    const h3 = room.querySelector("h3")
    h3.innerText = `Room: ${roomName} (${newCount})`

    addMessage(`-- ${nickname} -- left`)
})
socket.on("new_message", (msg) => {
    addMessage(msg)
})
socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul")

    roomList.innerHTML = ""
    if (rooms.length == 0) {
        return
    }

    rooms.forEach((room) => {
       const li = document.createElement("li")
       li.innerText = room
       roomList.append(li) 
    });
})