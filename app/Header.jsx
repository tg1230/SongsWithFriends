const React = require("react");
const useWindowDimensions = require('./responsive').useWindowDimensions

function Header(props) {
  
  const {height, width} = useWindowDimensions();
  
  function openInvite() {
    document.getElementById("inviteOverlay").style.display = "flex";
  }

  function closeInvite() {
    document.getElementById("inviteOverlay").style.display = "none";
  }
  
  // Mobile
  if (width < 600) {
    return (
      <div className="header">
      
        <div className="headerButtonsContainer">
          <button className="whiteLogoBtn" onClick={() => {props.toggleIsChatOpen()}}>
            <i class="fas fa-comment-alt"></i>
          </button>
          <div className="inviteLogoutButtonGroup">
            <button className="stdTxtBtn invite" onClick={openInvite}>
              Invite
            </button>
            <a href="https://scrawny-chief-nurse.glitch.me/user/logoff">
              <i class="fas fa-sign-out-alt soundBtn"></i>
            </a>
          </div>
        </div>
        
        <div className="playlistNameContainer">
          <div className="playlistName" contenteditable="true" id="playListName">
            {props.playlistName}
          </div>
          <i class="fas fa-pen"></i>
        </div>   
      
        <div id="inviteOverlay">
          <div id="inviteContainer">
            <a className="hallow stdTxtBtn" href="https://scrawny-chief-nurse.glitch.me">
              https://scrawny-chief-nurse.glitch.me/
            </a>
            <button className="chatCloseButton" onClick={closeInvite}>
              <i className="fas fa-plus rot-45"></i>            
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Desktop
  else {
    return (
      <div className="header">
      
        <div className="playlistNameContainer">
          <div className="playlistName" contenteditable="true" id="playListName">
            {props.playlistName}
          </div>
          <i class="fas fa-pen"></i>
        </div>   
      
        <div className="headerButtonsContainer">
          <button className="stdTxtBtn invite" onClick={openInvite}>
            Invite
          </button>
          <a href="https://scrawny-chief-nurse.glitch.me/user/logoff">
            <i class="fas fa-sign-out-alt soundBtn"></i>
          </a>
        </div>
      
        <div id="inviteOverlay">
          <div id="inviteContainer">
            <a className="hallow stdTxtBtn" href="https://scrawny-chief-nurse.glitch.me">
              https://scrawny-chief-nurse.glitch.me/
            </a>
            <button className="chatCloseButton" onClick={closeInvite}>
              <i className="fas fa-plus rot-45"></i>            
            </button>
          </div>
        </div>
      </div>
    );
  }  
}

module.exports = Header;