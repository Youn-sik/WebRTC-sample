const socket = io()

const myFace = document.getElementById("myFace")
const muteBtn = document.getElementById("mute")
const cameraBtn = document.getElementById("camera")
const camerasSelect = document.getElementById("cameras")

const welcome = document.getElementById("welcome")
const call = document.getElementById("call")
const welcomeForm = welcome.querySelector("form")

call.hidden = true

let myStream
let muted = false
let cameraOff = false
let roomName

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === "videoinput")
        const currentCamera = myStream.getVideoTracks()[0]
        
        cameras.forEach((camera) => {
            const option = document.createElement("option")
            option.value = camera.deviceId
            option.innerText = camera.label

            if (currentCamera.label == camera.label) {
                option.selected = true
            }
            
            camerasSelect.appendChild(option)
        })
    } catch(e) {
        console.error(e)
    }

}

async function getMedia(deviceId) {
    try {
        // https://developer.mozilla.org/ko/docs/Web/API/MediaDevices
        // 위의 문서와 같이 메서드를 사용할 수 있다.
        // 첫 번째 메서드인 enumerateDevices() 는 연결 된 미디어 모든 기기의 정보를 가져온다.
        // 디바이스는 안됨 ㅠㅠ
        // myDevice = await navigator.mediaDevices.enumerateDevices()

        if (deviceId == "") {
            // 아래에 사용된 메서드는 시스템의 카메라와 오디오 기기의 정보를 가져오는 것이다.
            myStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            })
        } else {
            myStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {deviceId: {exact: deviceId}}
            })
        }
        
        myFace.srcObject = myStream
        if (deviceId == "") {
            await getCameras()
        }
    } catch(e) {
        console.error(e)
    }
}

function handleMuteClick() {
    myStream.getAudioTracks().forEach((track) => { track.enabled = !track.enabled })

    if (!muted) {
        muteBtn.innerText = "Unmute"
        muted = true
    } else {
        muteBtn.innerText = "Mute"
        muted = false
    }
}

function handleCameraClick() {
    myStream.getVideoTracks().forEach((track) => { track.enabled = !track.enabled })

    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera Off"
        cameraOff = false
    } else {
        cameraBtn.innerText = "Turn Camera On"
        cameraOff = true
    }
}

////////

async function handleCameraChange() {
    // 함수를 다시 호출하면 카메라가 재로딩 된다.
    await getMedia(camerasSelect.value)
    if (myPeerConnection) {
        // 아래의 videoTrack 은 변경된 Track 이다.
        const videoTrack = myStream.getVideoTracks()[0]
        // 아래의 senders 는 stream 을 전송하고 있는 peer 를 컨트롤 할 수 있는 객체이다.
        const senders = myPeerConnection.getSenders() // 16
        // Track 이 video 인것을 고른다.
        const videoSender = senders.find((sender) => sender.track.kind == "video")
        // Track 을 변경한다.
        videoSender.replaceTrack(videoTrack) //17
    }
}

async function initCall() {
    welcome.hidden = true
    call.hidden = false
    await getMedia("")
    makeConnection()
}

async function handleWelcomSubmit(event) {
    event.preventDefault()

    const input = welcomeForm.querySelector("input")
    await initCall() // myPeerConnection 을 생성한 후에 join 하도록 처리.
    socket.emit("join_room", input.value)
    roomName = input.value
    input.value = ""
}


muteBtn.addEventListener("click", handleMuteClick)
cameraBtn.addEventListener("click", handleCameraClick)
camerasSelect.addEventListener("input", handleCameraChange)
welcomeForm.addEventListener("submit", handleWelcomSubmit)

socket.on("welcome", async () => {
    // 아래의 offer 가 A 가 다른 브라우저가 참가할 수 있도록 초대장을 만들고 있다고 생각하면 된다.
    // 이 이벤트는 A 가 받는다. A 가 먼저 room 에 들어가있고 이후에 B 가 room 에 들어오면서
    // 이 이벤트가 호출 되기 때문에 room 에 먼저 들어간 이가 A 가 되고 해당 A 가 아래 코드를 실행시킨다.
    const offer = await myPeerConnection.createOffer() // 4
    myPeerConnection.setLocalDescription(offer) // 5

    console.log("create offer")
    console.log("send offer")

    // offer 을 전송할건데, 어떤 room 에 전송할지 지정해서 보내야한다.
    socket.emit("offer", offer, roomName) // 6 -> server.js 에서 room 에 해당 offer 을 전송한다.
})

socket.on("offer", async (offer) => {
    // 이 이벤트는 B 가 받는다. B 가 들어와있는 room 으로 socket 을 통해 offer 을 emit 하였기 때문이다.
    console.log("recive offer")
    myPeerConnection.setRemoteDescription(offer) // 7
    const answer = await myPeerConnection.createAnswer() // 8
    myPeerConnection.setLocalDescription(answer) // 9
    socket.emit("answer", answer, roomName) // 10
    console.log("create answer")
    console.log("send answer")
})

socket.on("answer", (answer) => {
    // 이 이벤트는 A 가 받는다. B 에서 answer 을 전송하였다.
    console.log("recive answer")
    myPeerConnection.setRemoteDescription(answer)
})

socket.on("ice", (ice) => {
    // 이 이벤트는 A 와 B 가 같이 사용한다.
    console.log("receive iceCandidate")
    myPeerConnection.addIceCandidate(ice) // 13
    console.log("add iceCandidate")
})

// RTC code 
/*
RTC 통신을 위해서는 Socket.IO 를 통해 각각의 피어 설정을 하고 초기 연결을 하고
이후로는 P2P 로 통신한다.
그러므로 일단 소켓을 사용하여 초기 연결을 한다.
그 부분이 위의 socket.on("welcom") 부분이다. 참조.

프로세스 이미지는 아래 참고 (addStream 이 addTrack 임)
https://miro.medium.com/max/800/1*hQHzaT-JB1Wx3y0qtQX8Kw.png

-- Process Signalling --
1. Get getUserMedia() - A,B // 미디어를 가져온다. -> 위에서 함
2. Create RTCPeerConnection() - A,B // PeerConnection 을 생성한다. -> 2
3. Set addTrack() - A,B // addStream 대신에 addTracks 를 통해서 peer 에게 track 을 할당한다. -> 3
4. Create createOffer() - A // offer 을 생성한다. -> 4
5. Set setLocalDescription() - A // offer 로 Description(연결)을 구성한다. -> 5
6. Send send offer - A // offer 을 소켓 서버로 (B 에게 전송하기 위해) 전송한다. -> 6
7. Set setRemoteDescription() - B // remote(B) 의 Description 을 구성한다. -> 7
8. Create createAnswer() - B // 응답을 생성한다. -> 8
9. Set setLocalDescription() - B // anwer 로 Description(연결)을 구성한다. -> 9
10. Send send offer - B // answer 을 소켓 서버로 (A 에게 전송하기 위해) 전송한다. -> 10

-- Ice Candidate --
11. Create addEventListener("icecandidate") - A,B // offer 와 answer 을 통해 signalling 이 끝나면 iceCandidate 를 생성한다. -> 11
12. Send iceCandidate - A,B // iceCandidate 를 socket 서버를 통해 각각 전송한다. -> 12
13. Add addICECandidate - A,B // iceCandidate 를 socket 서버를 통해 각각 받아서 추가한다. -> 13

-- Add Stream --
14. Create addEventListener("addstream") - A,B // iceCandidate 를 모두 주고 받으면 해당 동작을 실행한다. -> 14
15. Add addStream - A,B // iceCandidate 를 모두 주고 받으면 해당 동작을 실행한다. -> 15
16. 기타 버그 수정를 위해 : RTCPeerConnection.getSenders() // 이를 통해서 senders(tracks, iceCandidate 등 정보 포함)을 가져온다. -> 16
* sender 는 peer 로 보내진 media stream track 을 컨트롤한다.
17. RTCRtpSender.replaceTrack() 을 통해서 Track 을 변경한다. -> 17
*/
let myPeerConnection

function makeConnection() {
    // Create Peer Connection
    myPeerConnection = new RTCPeerConnection() // 2
    myPeerConnection.addEventListener("icecandidate", handleIce) // 11
    myPeerConnection.addEventListener("addstream", handleAddStream) // 14

    // Input Stream Data(Track) into Peer
    // Add Stream 대신에 Add Track 을 통해서 추가함.
    myStream.getTracks().forEach((track) => { // 3
        myPeerConnection.addTrack(track, myStream)
    })
}

function handleIce(data) {
    // 이 이벤트는 A 와 B 가 같이 사용한다.
    // Signalling Process 가 끝나면 바로 iceCandidate 를 생성한다.
    // iceCandidate 를 socket 서버를 통해 전달한다. (서로가 서로에게)
    console.log("created ice candidate")
    socket.emit("ice", data.candidate, roomName) // 12
    console.log("send ice candidate")
}

function handleAddStream(data) {
    // 이 이벤트는 A 와 B 가 같이 사용한다.
    // ICECandidate 가 끝나면 바로 addStream 이벤트가 실행된다.
    // A 가 받는 data 는 B 로 부터 온거고
    // B 가 받는 data 는 A 로 부터 온거다.
    console.log("got an stream from my peer")
    console.log("Peer's Stream:", data.stream)
    console.log("My Stream", myStream)

    const peersStream = document.getElementById("peerFace")
    peersStream.srcObject = data.stream
}