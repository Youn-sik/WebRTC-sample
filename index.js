let connectButton = null;
let disconnectButton = null;
let sendButton = null;
let messageInputBox = null;
let receiveBox = null;

let localConnection = null; // RTCPeerConnection for our "local" connection
let remoteConnection = null; // RTCPeerConnection for the "remote"

let sendChannel = null; // RTCDataChannel for the local (sender)
let receiveChannel = null; // RTCDataChannel for the remote (receiver)

// startup for index.html page
function startup() {
    connectButton = document.getElementById("connectButton");
    disconnectButton = document.getElementById("disconnectButton");
    sendButton = document.getElementById("sendButton");
    messageInputBox = document.getElementById("message");
    receiveBox = document.getElementById("receivebox");

    // Set event listeners for user interface widgets

    connectButton.addEventListener("click", connectPeers, false);
    disconnectButton.addEventListener("click", disconnectPeers, false);
    sendButton.addEventListener("click", sendMessage, false);

    console.log("startup")
}

function connectPeers() {
    LocalPeer()
    RemotePeer()

    console.log("connectPeers")
}

function LocalPeer() {
    setupLocalPeer()
    setupICECandidateLocalPeer()
}

function RemotePeer() {
    setupRemotePeer()
    setupICECandidateRemotePeer()
}

// create connection for local peer
function setupLocalPeer() {
    localConnection = new RTCPeerConnection()

    sendChannel = localConnection.createDataChannel("sendChnnel")
    sendChannel.onopen = handleSendChannelStatusChange
    sendChannel.onclose = handleSendChannelStatusChange
}

// create connection for remote peer
function setupRemotePeer() {
    remoteConnection = new RTCPeerConnection()
    remoteConnection.ondatachannel = receiveChannelCallback
}

// create ICE candidate for local peer
function setupICECandidateLocalPeer() {
    localConnection.onicecandidate = (e) =>
        !e.candidate ||
        remoteConnection.addIceCandidate(e.candidate).catch(handleAddCandidateError);
}

// create ICE candidate for remote peer
function setupICECandidateRemotePeer() {
    remoteConnection.onicecandidate = (e) =>
        !e.candidate ||
        localConnection.addIceCandidate(e.candidate).catch(handleAddCandidateError);
}

function startConnectionAttempt() {
    /*
        Note: Once again, this process is not a real-world implementation; 
        in normal usage, there's two chunks of code running on two machines, 
        interacting and negotiating the connection.
        A side channel, commonly called a "signalling server," is usually 
        used to exchange the description (which is in application/sdp form) 
        between the two peers.
    */

    localConnection
        // SDP blob ??? ????????? offer ????????? ????????????.
        .createOffer()
        // offer ??? ???????????? remoteConnection?????? offer ??? ???????????? ?????? description ??? offer ??? ????????????.
        .then((offer) => localConnection.setLocalDescription(offer))
        // local ?????? description ??? set ?????? remoteConnection ?????? ?????? description ??? local ??? description ?????? ????????????.
        .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
        // offer ??? ?????? ?????? remoteConnection ??? localConnection ?????? ????????? ????????? ????????? answer ????????? ????????????.
        .then(() => remoteConnection.createAnswer())
        // answer ????????? ???????????? remoteConection ??? localDescription ??? ????????? ????????????.
        .then((answer) => remoteConnection.setLocalDescription(answer))
        // localConnection ??? remoteConnection ?????? ????????? answer ????????? ?????????.
        .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
        // ?????? ?????????
        .catch(handleCreateDescriptionError);
}

function handleCreateDescriptionError(error) {
    console.log(`Unable to create an offer: ${error.toString()}`);
}
  
function handleLocalAddCandidateSuccess() {
    connectButton.disabled = true;
}
  
function handleRemoteAddCandidateSuccess() {
    disconnectButton.disabled = false;
}
  
function handleAddCandidateError() {
    console.log("Oh noes! addICECandidate failed!");
}

function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
}

function handleSendChannelStatusChange(event) {
    if (sendChannel) {
        const state = sendChannel.readyState;
    
        if (state === "open") {
            console.log("open")
            messageInputBox.disabled = false;
            messageInputBox.focus();
            sendButton.disabled = false;
            disconnectButton.disabled = false;
            connectButton.disabled = true;
        } else {
            console.log("close")
            messageInputBox.disabled = true;
            sendButton.disabled = true;
            connectButton.disabled = false;
            disconnectButton.disabled = true;
        }
    }
}

function handleReceiveChannelStatusChange(event) {
    if (receiveChannel) {
        console.log(
            `Receive channel's status has changed to ${receiveChannel.readyState}`
        );
    }
}

function sendMessage() {    
    const message = messageInputBox.value;
    sendChannel.send(message);

    messageInputBox.value = "";
    messageInputBox.focus();
}

function handleReceiveMessage(event) {
    console.log(event.data)
    const el = document.createElement("p");
    const txtNode = document.createTextNode(event.data);
  
    el.appendChild(txtNode);
    receiveBox.appendChild(el);
}

function disconnectPeers() {
    // Close the RTCDataChannels if they're open.
  
    sendChannel.close();
    receiveChannel.close();
  
    // Close the RTCPeerConnections
  
    localConnection.close();
    remoteConnection.close();
  
    sendChannel = null;
    receiveChannel = null;
    localConnection = null;
    remoteConnection = null;
  
    // Update user interface elements
  
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    sendButton.disabled = true;
  
    messageInputBox.value = "";
    messageInputBox.disabled = true;
}

window.onload = function() {
    startup()
};