const React = require("react");

function Search(props) {
  
  const [searchResults, setSearchResults] = React.useState([]);
  
  function searchFor() {
    setSearchResults([]);
    var itemToSearch = document.getElementById("itemToSearch").value;
    itemToSearch = encodeURIComponent(itemToSearch.trim())
    initiateGet("search", "&q=" + itemToSearch);
  }

  function updateSearchResults(newResults) {
    setSearchResults(searchResults.concat(newResults));
    document.getElementById("starterSearchText").style.display = "none";
     document.getElementById("searchIcon").style.display = "none";
  }

  function openSearch() {
    document.getElementById("overlay").style.display = "flex";
  }

  function closeSearch() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("itemToSearch").value = "";
    setSearchResults([]);
    document.getElementById("starterSearchText").style.display = "flex";
    document.getElementById("searchIcon").style.display = "flex";
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
        // success?
        //console.log("Data received: ", xhr.responseText);
        // TODO figure out how to make this not hardcoded, callback?
        if (getRequest == "search") {
          try {
            let searchResults = JSON.parse(xhr.responseText);
            updateSearchResults(searchResults);
          } catch (e) {
            console.log("Search results error");
          }
        }
      } else {
        // failure?
        console.log("Spotify data not received: ", xhr.responseText);
      }
    });
    // Actually send request to server
    xhr.send();
  }
  
  return (
    <div id="overlay">
      <div id="overlayBox">
        <div className="TitleAndExit">
          <span id="shareTitle">Add Songs to Queue</span>
          <span id="exitIcon" onClick={closeSearch}>
            ✕
          </span>
        </div>
        <div>
          <div className="searchBarButton">
            <input type="text" id="itemToSearch" className="searchBar"  placeholder="Search by title, artist, or album">
             
            </input>
            <button className="searchButton" onClick={searchFor}>
              Search
            </button>
          </div>
        </div>
        <div className="searchResultsHeaders">
          <span className="searchTitle">Title</span>
          <span className="searchArtist">Artist</span>
          <span className="searchArtist">Album</span>
        </div>
        <div></div>
        {searchResults.map(results => (
          <div className="search">
            <span className="searchResultsa">{results.songName}</span>
            <span className="searchResultsb">{results.artist}</span>
            <span className="searchResultsc">{results.album}</span>
            <button className="searchAdd" onClick={() => props.addSong(results)}>Add</button>
          </div>
        ))}
        <i id="searchIcon" class="fas fa-search"></i>
        <div id="starterSearchText">No results to show...yet</div>
      </div>
    </div>
  );
}

module.exports = Search;
