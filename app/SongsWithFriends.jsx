const React = require("react");
const url = "wss://scrawny-chief-nurse.glitch.me/user";
const connection = new WebSocket(url);
const Search = require("./Search");
const helpers = require("./helpers");
const CurrentSong = require("./CurrentSong");
const Playlist = require("./Playlist");
const Chat = require("./Chat");
const Header = require("./Header");

var isHost = helpers.checkHost();

var rowId = parseInt(helpers.getQueryVariable("rowid"));
var isPlaying = false;
var playlistInitialized = false;
var alert = false;

const SongsWithFriends = function() {
  const [playlist, setPlaylist] = React.useState([]);
  const [currentSong, setCurrentSong] = React.useState({
    key: 0,
    id: "",
    name: "",
    album: "",
    artist: "",
    songLength: 1,
    percentage: 0,
    currentSongProgress: 0
  });
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [playlistName, setPlaylistName] = React.useState("Playlist");
  if (!playlistInitialized) {
    initiateGet("getPlaylist", "");
    playlistInitialized = true;
  }
  // Sets up websocket message listener
  React.useEffect(() => {
    connection.addEventListener("message", event => {
      let messageData = JSON.parse(event.data);
      let messageType = messageData.messageType;
      if (messageType == "hostInfo") {
        if (isHost && !messageData.is_playing) {          
          if (messageData.body == undefined) {
            console.log("Issue with host, no data returned from endpoint")
            startAlert();
            
          } else {
            console.log("Host working, just paused")
            if (alert) {
              stopAlert()
            }
          }
        }
        HandleSync(messageData);
      } else if (messageType == "playlistUpdated") {
        let playlistCopy = playlist;
        setPlaylist(messageData.playlist);
      }
    });
  }, []);

  function startAlert() {
    let currentSongCopy = currentSong;
    currentSongCopy.name = "Issue with playback device, please try starting and stopping";
    setCurrentSong({ ...currentSong, currentSongCopy });
    alert = true;
  }
  
  function stopAlert() {
    let currentSongCopy = currentSong;
    currentSongCopy.name = "";
    setCurrentSong({ ...currentSong, currentSongCopy });
    alert = false;
  }
  
  const addSong = songInfo => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open("POST", "/songAdded", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(songInfo));

    // callback function executed when the HTTP response comes back
    xhr.onloadend = function(e) {
      // Get the server's response body
      //console.log(xhr.responseText);
    };
  };

  // Keep client's in sync based off of host data that's polled every x amount
  // If nonhost not playing but host is, try to play on device
  // else if nonhost is playing but not right song, update current song
  // else if nonhost is not in sync, play song at right spot
  function HandleSync(hostInfo) {
    if (!isHost) {
      updateNonHost(hostInfo);
    } else if (isHost) {
      isPlaying = hostInfo.is_playing;
    }
    // Finally, update everyones currentSong with whatever the host is playing
    if (isPlaying && !alert) {
      if (isPlaying && hostInfo.is_playing && !isHost) {
        handleScrubbing(hostInfo);
      }
      let currentSongCopy = currentSong;
      var percentage =
        hostInfo.body.progress_ms / hostInfo.body.item.duration_ms;
      currentSongCopy.percentage = percentage * 100;
      currentSongCopy.name = hostInfo.body.item.name;
      currentSongCopy.artist = hostInfo.body.item.artists[0].name;
      currentSongCopy.album = hostInfo.body.item.album.name;
      currentSongCopy.id = hostInfo.body.item.id;
      currentSongCopy.songLength = hostInfo.body.item.duration_ms;
      currentSongCopy.currentSongProgress = hostInfo.body.progress_ms;
      setCurrentSong({ ...currentSong, currentSongCopy });
      // onsole.log("Updated current song: ", currentSongCopy);
    }
  }

  function updateNonHost(hostInfo) {

    if (!isPlaying && hostInfo.is_playing) {
      isPlaying = true;
      console.log("first");
      initiateGet(
        "play",
        "&songId=" + hostInfo.body.item.id + "&pos=" + hostInfo.body.progress_ms
      );
    } else if (isPlaying && hostInfo.is_playing) {
      if (currentSong.id != hostInfo.body.item.id) {
        console.log("second");
        isPlaying = true;
        initiateGet(
          "play",
          "&songId=" +
            hostInfo.body.item.id +
            "&pos=" +
            hostInfo.body.progress_ms
        );
      }
    } else if (isPlaying && !hostInfo.is_playing) {
      initiateGet("pause", "");
      isPlaying = false;
    }
  }

  function handleScrubbing(hostInfo) {
    if (
      currentSong.currentSongProgress > 10000 &&
      currentSong.currentSongProgress + 10000 < hostInfo.body.progress_ms
    ) {
      isPlaying = false;
    }
  }

  // potential htmlParameters: &=rowId, &=song, &=volume
  function initiateGet(getRequest, htmlParameters) {
    let xhr = new XMLHttpRequest();
    // it's a GET request, it goes to URL
    let html = window.location.href;
    let queryString = html.split("?");
    xhr.open("GET", getRequest + "?" + queryString[1] + htmlParameters, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // Next, add an event listener for when the HTTP response is loaded
    xhr.addEventListener("load", function() {
      if (xhr.status == 200) {
        if (getRequest == "play" && xhr.responseText != []) {
          console.log("Issue with client playback");
          // Trigger alert for client here
          isPlaying = false;
          startAlert();
        } else {
          console.log("Client playback working");
          stopAlert();
        }
        if (getRequest == "getPlaylist") {
          setPlaylist(JSON.parse(xhr.responseText));
        }
      } else {
        // failure?
        console.log("Spotify data not received: ", xhr.responseText);
      }
    });
    // Actually send request to server
    xhr.send();
  }

  //<Playlist playlistName={PlaylistName} playlist={Playlist[0]} openSearch={() => openSearch()}/>

  function openSearch() {
    document.getElementById("overlay").style.display = "flex";
    // document.getElementById("starterSearchText").style.display = "none";
    //  document.getElementById("searchIcon").style.display = "none";
  }
  
  return (
    <div className="mainContainer">
      <Header playlistName={playlistName} toggleIsChatOpen={() => {setIsChatOpen(!isChatOpen); console.log("1");}}></Header>
      <Playlist
        playlistName={playlistName}
        playlist={playlist}
        openSearch={() => openSearch()}
      />
      <CurrentSong
        name={currentSong.name}
        artist={currentSong.artist}
        album={currentSong.album}
        currentSongProgress={currentSong.currentSongProgress}
        percentage={currentSong.percentage}
        songLength={currentSong.songLength}
        mute={() => initiateGet("changeVolume", "&volume=0") }
        unmute={() => initiateGet("changeVolume", "&volume=50") }
      />
      <Chat connection={connection} currentUser={rowId} isChatOpen={isChatOpen}  setIsChatOpen={isOpen => {setIsChatOpen(isOpen); console.log("2");}}></Chat>
      <Search addSong={songInfo => addSong(songInfo)} />
    </div>
  );
};

module.exports = SongsWithFriends;
