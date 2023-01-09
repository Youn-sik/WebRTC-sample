const express = require("express")
const http = require("http")
const SocketIO = require("socket.io")
const app = express()
const {instrument} = require("@socket.io/admin-ui")

app.set("view engine", "pug")
app.set("views", __dirname + "/views")
app.use("/public", express.static(__dirname + "/public"))
app.get("/", (req, res) => {
    res.render("home")
})
app.get("/*", (req, res) => {
    res.redirect("/")
})

const handleListen = () => {
    console.log("Listening on http://localhost:3000")
    console.log("Listening on ws://localhost:3000")
}
// 기존의 express (app.listen) 방식으로는 websocket 을 구동할 수 없기 때문에
// 아래와 같이 http 모듈을 통해서 express app 과 ws 를 구현할 수 있다.
// 이와 같은 상황은 3000 포트가 두 개의 프로토콜을 사용하는 것이다.
const server = http.createServer(app)
const io = SocketIO(server, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    }
})
instrument(io, {
    auth: false,
})

function publicRooms() {
    //io.sockets.adapter 을 통해서 현재 rooms 또는 sids 등을 확인할 수 있다.
    const sids = io.sockets.adapter.sids
    const rooms = io.sockets.adapter.rooms
    const publicRooms = []

    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key)
        }
    })

    return publicRooms
}

function countRoom(roomName) {
    return io.sockets.adapter.rooms.get(roomName)?.size
}

io.on("connection", (socket) => {
    // socket.emit 시 마지막 인자로 callback 을 전달하면 아래와 같이
    // done 을 통해 콜백 함수를 실행할 수 있다.
    // 해당 callback 은 frontend 에서 실행 된다.
    // ++ callback 뿐만 아니라 아무 매개변수나 계속 넣을 수 있다.
    /*
    ex)
    socker.on("enter_room", (a,b,c,d,e ..., done) => {
        ...
        done()
    })
    */
    socket.nickname = "Anon"

    socket.onAny((event) => {
        console.log(`SOcket Event: ${event}`)
    })
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName)
        done()
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName))
        io.sockets.emit("room_change", publicRooms())
    })
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => {
            // countRoom(nameName) - 1 을 해주는 이유는 room 이 삭제되기 직전이기 때문에
            // 곧 커넥션이 끊어질 해당 연결에 대해서는 제외해준다.
            socket.to(room).emit("bye", socket.nickname, countRoom(room)-1)
        });
    })
    socket.on("disconnect", () => {
        io.sockets.emit("room_change", publicRooms())
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`)
        done()
    })
    socket.on("nickname", (nickname) => {
        socket.nickname = nickname
    })
})

/*
const ws = require("ws")
const wss = new ws.Server({server})
let sockets = []

wss.on("connection", (socket) => {
    sockets.push(socket)
    socket.nickname = "Anon"

    console.log("socket connected")

    socket.on("close", () => {
        console.log("socket closed")
    })

    socket.on("message", (msg) => {
        let msgData = msg.toString()
        let data = JSON.parse(msgData)

        switch (data.type) {
            case "new_message" : sockets.forEach((sock) => sock.send(`${socket.nickname}: ${data.payload}`))
            case "nickname" : socket.nickname = data.payload
        }
    })
})
*/

server.listen(3000, handleListen)