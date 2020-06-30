const React = require('react');
const helpers = require('./helpers');
const useWindowDimensions = require('./responsive').useWindowDimensions

const ProgressBar = props => {
  return (
    <div className="progressBar">
      <Filler percentage={props.percentage} />
    </div>
  );
};

const Filler = props => {
  let percentage = props.percentage;
  percentage = percentage + "%";
  return <div className="filler" style={{ width: percentage }} />;
};

function CurrentSong(props) {
  
  const {height, width} = useWindowDimensions();
  
  if (width < 600) {
    return (
      <div className="Footer">
        <div className="playerTop">
          <button className="soundBtn volUpBtn" onClick={props.unmute}>
            <i className="fas fa-volume-up"/>
          </button>
          <div className="songInfo">
            <div className="currentSongTitle">{props.name}</div>
            <div className="currentSong">{props.artist} { props.artist ? "·" : ""} {props.album}</div>
          </div>
          <button className="soundBtn muteBtn" onClick={props.mute}>
            <i className="fas fa-volume-mute"/>
          </button>
        </div>
        <div className="playerBottom">
          <div className="currentSongProgress">
            {helpers.convertToMinutes(props.currentSongProgress)}
          </div>
          <ProgressBar percentage={props.percentage} />
          <div className="currentSongProgress">
            {helpers.convertToMinutes(props.songLength)}
          </div>
        </div>
      </div>
    )
  }
  else {
    return (
      <div className="Footer">
        <div className="playerTop">
          <div className="currentlyPlaying">Currently Playing:</div>
          <div className="songInfo">
            <div className="currentSongTitle">{props.name}</div>
            <div className="currentSong">{props.artist} { props.artist ? "·" : ""} {props.album}</div>
          </div>
        </div>
        <div className="playerBottom">
          <button className="soundBtn muteBtn" onClick={props.mute}>
            <i className="fas fa-volume-mute"/>
          </button>
          <button className="soundBtn volUpBtn" onClick={props.unmute}>
            <i className="fas fa-volume-up"/>
          </button>
          <div className="currentSongProgress">
            {helpers.convertToMinutes(props.currentSongProgress)}
          </div>
          <ProgressBar percentage={props.percentage} />
          <div className="currentSongProgress">
            {helpers.convertToMinutes(props.songLength)}
          </div>
        </div>
      </div>
    );
  }
}

module.exports = CurrentSong;