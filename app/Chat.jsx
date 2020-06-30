const React = require("react");

let userColors = {};
let i = 0;

function Chat(props) {
  const [messages, setMessages] = React.useState([])
  let scrollDiv = React.createRef()
  
  // Scroll to bottom when there is a new message
  React.useEffect(() => {
    if (scrollDiv.scrollIntoView) {
      scrollDiv.scrollIntoView()
    }
  }, [messages])
  const addMessage = (msgObj) => {
    if (!(msgObj.from in userColors)) {
      userColors[msgObj.from] = getRandomColor()
    }
    setMessages(old => old.concat(msgObj))
  }
  
  // Listen for websocket messages
  React.useEffect(() => {
    props.connection.addEventListener("message", onMessageReceived);
  }, [])

  const onMessageSend = message => {
    let msgObj = {
      type: "message",
      msg: message,
      from: props.currentUser
    }
    props.connection.send(JSON.stringify(msgObj))
    addMessage(msgObj)
  }
  
  const onMessageReceived = event => {
    let msgObj = JSON.parse(event.data);
    if (msgObj.type == "message" && msgObj.from != props.currentUser) {
      addMessage(msgObj);
    }
  };
  
  let messagesComponents = []
  for (let i = 0; i < messages.length; i++){
    let messageObject = messages[i];
    let userColor = userColors[messageObject.from]
    messagesComponents.push(<Message messageObject={messageObject} userColor={userColor} currentUser={props.currentUser}></Message>);
  }

  let chatComponent = null;
  
  if (props.isChatOpen) {
    chatComponent = (
      <div className="chat">
        <div className="chatTopBar" onClick={() => {props.setIsChatOpen(false)}}>
          <p className="chatTitle">Chat</p>
          <button className="chatCloseButton">
            <i className="fas fa-plus rot-45"></i>
          </button>
        </div>
        <div className="messagesContainer">
          {messagesComponents}
          <div ref={(el)=> {scrollDiv = el}}></div>
        </div>
        <MessageSender onSendMessage={onMessageSend}></MessageSender>
      </div>
    );
  }
  else {
    chatComponent = (
      <div className="collapsedChatBar" onClick={() => {props.setIsChatOpen(true)}}>
        <p className="chatTitle">Chat</p>
        <button className="chatOpenButton">
          <i className="fas fa-chevron-up"></i>
        </button>
      </div>
    )
  }
  
  return chatComponent;
}

function Message(props) {
  let sender = props.messageObject.from;
  let msg = props.messageObject.msg;
  let currentUser = props.currentUser;

  let userBubble = null;

  let messageClass = "messageContainer";
  if (currentUser == sender) {
    messageClass += " isSender";
  }
  else {
    userBubble = (<UserBubble color={props.userColor}></UserBubble>)
  }
  return (
    <div className={messageClass}>
      {userBubble}
      <div className="message">{msg}</div>
    </div>
  )
}

function UserBubble(props) {
  return (
    <div className="userBubble" style={{backgroundColor:props.color}}></div>
  )
}

function MessageSender(props) {

  const [messageText, setMessageText] = React.useState("");
  
  function handleChange(event){
    setMessageText(event.target.value)
  }

  function handleKeyPress(event) {
    if(event.key === 'Enter'){
      SendMessage()
    }
  }
  
  function SendMessage() {
    if (messageText != "") {
      props.onSendMessage(messageText)
      setMessageText("")
    } 
  }

  return (
    <div className="messageSender" onKeyPress={handleKeyPress}>
      <input className="messageTextInput" type="text" value={messageText} onChange={handleChange}></input>
      <button className="messageSendButton" onClick={SendMessage}>
        <i className="fas fa-location-arrow"></i>
      </button>
    </div>
  )
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

module.exports = Chat;
