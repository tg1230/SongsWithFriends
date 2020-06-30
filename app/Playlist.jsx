const React = require("react");
const helper = require("./helpers");

function Song(props) {
  return (
    <div className="songContainer">
      <div className="songTopRow">
        <div className="songName">{props.name} </div>
        <div className="songTime">
          {helper.convertToMinutes(props.songLength)}
        </div>
      </div>
      <div className="otherSongInfo">{props.artist} · {props.album}</div>
    </div>
  );
}

function Playlist(props) {
  return (
    <div className="playlist">
      {props.playlist.map(song => (
        <Song
          key={song.key}
          name={song.songName}
          artist={song.artist}
          album={song.album}
          songLength={song.songLength}
        />
      ))}
      <button className="fas fa-plus" onClick={props.openSearch}></button>
    </div>
  );
}

module.exports = Playlist;
