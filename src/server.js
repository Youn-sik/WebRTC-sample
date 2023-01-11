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
const io = SocketIO(server)

io.on("connection", (socket) => {
    socket.on("join_room", (roomName) => {
        socket.join(roomName)
        socket.to(roomName).emit("welcome")
    })
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer)
    })
    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer)
    })
    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice)
    })
})

server.listen(3000, handleListen)