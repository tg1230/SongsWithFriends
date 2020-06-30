// We need many modules

// some of the ones we have used before
const express = require("express");
const bodyParser = require("body-parser");
const assets = require("./assets");
const sql = require("sqlite3").verbose(); // we'll need this later
const usersdb = new sql.Database("users.db");
const request = require("request");
const WebSocket = require('ws');
const app = express();
app.use(express.json())

const http = require("http");
const server = http.createServer(app);

const wss = new WebSocket.Server({server});
// and some new ones related to doing the login process
const passport = require("passport");
// There are other strategies, including Facebook and Spotify
const SpotifyStrategy = require("passport-spotify").Strategy;

// Some modules related to cookies, which indicate that the user
// is logged in
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");

// Start setting up the Server pipeline
console.log("setting up pipeline");

// take HTTP message body and put it as a string into req.body
app.use(bodyParser.urlencoded({ extended: true }));

// Glitch assests directory
app.use("/assets", assets);

// puts cookies into req.cookies
app.use(cookieParser());

// pipeline stage that echos the url and shows the cookies, for debugging.
app.use("/", printIncomingRequest);

// Function for debugging. Just prints the incoming URL, and calls next.
// Never sends response back.
function printIncomingRequest(req, res, next) {
  // console.log("Serving",req.url);
  if (req.cookies) {
    //console.log("cookies",req.cookies)
  }
  next();
}

// Now some stages that decrypt and use cookies

// express handles decryption of cookies, storage of data about the session,
// and deletes cookies when they expire
app.use(
  expressSession({
    secret: "bananaBread", // a random string used for encryption of cookies
    maxAge: 6 * 60 * 60 * 1000, // Cookie time out - six hours in milliseconds
    // setting these to default values to prevent warning messages
    resave: true,
    saveUninitialized: false,
    // make a named session cookie; makes one called "connect.sid" as well
    name: "ecs162-session-cookie"
  })
);


// Now the pipeline stages that handle the login process itself

// ------------------------Passport Stuff--------------------------------------

passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://scrawny-chief-nurse.glitch.me/auth/accepted",
      scope: ["user-read-private","playlist-modify-private","playlist-modify-public", "user-read-playback-state", "user-modify-playback-state"]
    },
    gotProfile
  )
);

// Initializes request object for further handling by passport
app.use(passport.initialize());

// If there is a valid cookie, will call passport.deserializeUser()
// which is defined below.  We can use this to get user data out of
// a user database table, if we make one.
// Does nothing if there is no cookie
app.use(passport.session());

// Handler for url that starts off login with Google.
// The app (in public/index.html) links to here (note not an AJAX request!)
// Kicks off login process by telling Browser to redirect to Google.
// The first call to Passport, which redirects the login to Spotify to show the login menu
app.get('/auth/spotify', 
  function (req, res, next) {
    console.log("At first auth");
    next();
  },   
  passport.authenticate('spotify'), function(req, res) {
  // The request will be redirected to spotify for authentication, so this
  // function will not be called and we don't have to return the HTTP response.
});

app.get(
  "/auth/accepted",
  passport.authenticate("spotify", {
    successRedirect: "/setcookie",
    failureRedirect: "/"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

passport.serializeUser((dbRowID, done) => {
  // console.log("SerializeUser. Input is", dbRowID);
  done(null, dbRowID);
});


passport.deserializeUser((dbRowID, done) => {
  console.log("deserializeUser. Input is:", dbRowID);
  done(null, dbRowID);
});

// ^^^^^^^^^^^^^^^^^^^^^^Passport stuff^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// -----------------------Pipeline----------------------------

// Public files are still serverd as usual out of /public
app.get("/*", express.static("public"));

// special case for base URL, goes to index.html
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/login.html");
});

// stage to serve files from /user, only works if user in logged in

// If user data is populated (by deserializeUser) and the
// session cookie is present, get files out
// of /user using a static server.
// Otherwise, user is redirected to public splash page (/index) by
// requireLogin (defined below)
app.get("/user/*", requireUser, requireLogin, express.static("."));


// ^^^^^^^^^^^^^^^^^^^^^^^^Pipeline^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// ----------------------Authenticating Users----------------------
// Where we send their rowID
// One more time! a cookie is set before redirecting
// to the protected homepage
// this route uses two middleware functions.
// requireUser is defined below; it makes sure req.user is defined
// the second one makes a public cookie called
// google-passport-example
var numClients = 0;
var hostRowId = 0;


app.get("/setcookie", requireUser, function(req, res) {
  // if(req.get('Referrer') && req.get('Referrer').indexOf("google.com")!=-1){
  // mark the birth of this cookie
  // set a public cookie; the session cookie was already set by Passport
  res.cookie("google-passport-example", new Date());
  numClients += 1;
  console.log("Num clients: ", numClients)
  if (numClients == 1) {
    console.log("Host found")
    console.log("host rowid", req.user);
    hostRowId = req.user;
    startPoll();
    res.redirect("/user/room.html?rowid=" + req.user+"&isHost=true");
  } else {
    res.redirect("/user/room.html?rowid=" + req.user);
  }
  //} else {
  //   res.redirect('/');
  //}
});

// currently not used
// using this route, we can clear the cookie and close the session
app.get("/user/logoff", function(req, res) {
  console.log("num clients: ", numClients)
  if (numClients > 0) {
    numClients--;
  }
  if (numClients == 0) {
    playlist = [];
    hostRowId = 0;
    startup = false;
    console.log("Server globals reset")
    clearInterval(hostPolling);
  }
  // clear both the public and the named session cookie
  res.clearCookie("google-passport-example");
  res.clearCookie("ecs162-session-cookie");
  res.redirect("/");
});

function requireUser(req, res, next) {
  // console.log("require user", req.user);
  if (!req.user) {
    res.redirect("/");
  } else {
    // console.log("user is", req.user);
    next();
  }
}

function requireLogin(req, res, next) {
  // console.log("checking:", req.cookies);
  if (!req.cookies["ecs162-session-cookie"]) {
    res.redirect("/");
  } else {
    next();
  }
}

// ^^^^^^^^^^^^^^^^^^^Authenticating Users^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// ---------------------------Chat----------------------------------

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('connection----------')
    console.log(message)
    //ws.send("server echo:" + message);
    broadcast(message)
  })
  ws.send('connected!')
})

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// ^^^^^^^^^^^^^^^^^^^Chat^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// --------------------Our gets-----------------------------------

// Server continually checks the status of the host's playback device, then updates everyone 

var hostPolling;

function startPoll() {
  let cmd = "select SpotifyData from UsersTable where rowIdNum= ?";
  usersdb.get(cmd, hostRowId, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      //console.log("Spotify data found: ", row); 
      hostPolling = setInterval(function () {
        pollHostDevice(JSON.parse(row.SpotifyData));
      }, 1000);
    }
  }); 
} 


function pollHostDevice(spotifyData) {
  // initiate get request for playback status, depending on respnse, update everyone
  let url = "https://api.spotify.com/v1/me/player";

  const options = {
      url: url,
      json: true,
      headers: {
        // give them the user's token so they know we are authorized to control the user's playback
        "Authorization": `Bearer ${spotifyData.accessToken}`
      }
  };

  // send the PUT request!
  request.get(options, 
    // The callback function for when Spotify responds
    (err, postres, body) => {
      if (err) {
          return console.log(err);
      }
      if (body != undefined) {
        var message = { "messageType": "hostInfo", "is_playing": body.is_playing, "body": body };
        broadcast(JSON.stringify(message));
        handleHostPlaybackLogic(message);
        
      } else {
        var message = { "messageType": "hostInfo", "is_playing": false, "error": postres.statusCode};
        broadcast(JSON.stringify(message));
        handleHostPlaybackLogic(message);
      }
  });
}

// Handles starting, switching, and removing songs by updating the host logic/playlist which then updates all other devices
let startup = false;
function handleHostPlaybackLogic(hostInfo) {
   if (!hostInfo.is_playing && numClients > 1 && playlist.length > 0 && !startup) {
       console.log("Start playing");
       updateHostPlayback(hostRowId, playlist[0].id, 0, null);
       startup = true;
   } else if (hostInfo.is_playing) {
    
     if (hostInfo.body.item.duration_ms < hostInfo.body.progress_ms + 1500 && playlist.length > 1) {
     playlist.shift();
     console.log("Current Song Progress: ", hostInfo.body.progress_ms);
     console.log("Current Song Length: ", hostInfo.body.item.duration_ms);
       var message = { "messageType": "playlistUpdated", "playlist": playlist };
        broadcast(JSON.stringify(message));
     updateHostPlayback(hostRowId, playlist[0].id, 0, null);
     } else if (hostInfo.body.item.duration_ms < hostInfo.body.progress_ms + 1500 && playlist.length == 1) {
       playlist.shift();
       var message = { "messageType": "playlistUpdated", "playlist": playlist };
        broadcast(JSON.stringify(message));
       startup = false;
     }
   } 
}


// This request is sent from the Browser when a user pushes "play" on a song.
// Send the rowid and the spotify track string in the .get
app.get("/user/search", searchSpotify);

function searchSpotify(req, res, next) {
  console.log('user: ' + req.user)
  let cmd = "select SpotifyData from UsersTable where rowIdNum= ?";
  usersdb.get(cmd, req.query.rowid, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      console.log("Spotify data found: ", row); 
      console.log("Song data: ", req.query)
      searchSpotifyAPIRequest(row, req.query.songId, req.query.q, res);
    }
  }); 
} 

function searchSpotifyAPIRequest(row, song, q, res) {
  let spotifyData = JSON.parse(row.SpotifyData);
  // console.log("token used for api", spotifyData.accessToken);
  // next, do an API call to Spotify at this URL
  
  let url = "https://api.spotify.com/v1/search?q="+q+"&type=track"; 
console.log(url)
  const options = {
      url: url,
      json: true,
      headers: {
        // give them the user's token so they know we are authorized to control the user's playback
        "Authorization": `Bearer ${spotifyData.accessToken}`
      }
  };

  // send the PUT request!
  request.get(options, 
    // The callback function for when Spotify responds
    (err, postres, body) => {
      if (err) {
          return console.log(err);
      }
      if (postres.statusCode == 404 || postres.statusCode == 403) {
        console.log("error")
        
      } else {
        var i;
        var searchResults = []
        for (i=0; i<body.tracks.items.length; i++) {
          searchResults.push({id: body.tracks.items[i].id, songName: body.tracks.items[i].name, 
                              artist: body.tracks.items[i].artists[0].name, album: body.tracks.items[i].album.name, songLength: body.tracks.items[i].duration_ms})
          
        }
        res.send(searchResults)
      }
  });
  
}

app.get("/user/play", playSpotify);

function playSpotify(req, res, next) {
  let cmd = "select SpotifyData from UsersTable where rowIdNum= ?";
  usersdb.get(cmd, req.query.rowid, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      playSongAPIRequest(row, req.query.songId, req.query.pos, res);
      
    }
  }); 
} 

function updateHostPlayback(rowId, songInfo) {
  let cmd = "select SpotifyData from UsersTable where rowIdNum= ?";
  usersdb.get(cmd, rowId, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      playSongAPIRequest(row, songInfo, 0, null);
    }
  }); 
}

function playSongAPIRequest(row, song, pos, res) {
  let spotifyData = JSON.parse(row.SpotifyData);
  // console.log("token used for api", spotifyData.accessToken);
  // next, do an API call to Spotify at this URL
  let url = "https://api.spotify.com/v1/me/player/play";
  
  // put some data into the body of the PUT request we will send to Spotify
  let body = {"uris": ["spotify:track:" + song], "position_ms": pos}
  console.log(body)

  const options = {
      url: url,
      json: true,
      body: body,
      headers: {
        // give them the user's token so they know we are authorized to control the user's playback
        "Authorization": `Bearer ${spotifyData.accessToken}`
      }
  };

  // send the PUT request!
  request.put(options, 
    // The callback function for when Spotify responds
    (err, postres, body) => {
      if (err) {
        console.log("Users data: ", row.SpotifyData)
          return console.log(err);
        
      }
    
    if (res != null) {
      let errorCode = postres.statusCode;
      res.send(JSON.stringify(body));
      console.log("Client playback response: ", postres.statusCode)
    } else {
      console.log("Host playback response: ", postres.statusCode)
    }
    
  });
  
}

app.get("/user/pause", pauseSpotifyTrack);

function pauseSpotifyTrack(req, res, next) {
   
  let cmd = "select SpotifyData from UsersTable where rowIdNum= ?";
  usersdb.get(cmd, req.query.rowid, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      // console.log("Spotify data found: ", row); 
      pauseSongAPIRequest(row, res);
    }
  }); 
} 

function pauseSongAPIRequest(row, res) {
  let spotifyData = JSON.parse(row.SpotifyData);
  let url = "https://api.spotify.com/v1/me/player/pause";

  const options = {
      url: url,
      json: true,
      headers: {
        // give them the user's token so they know we are authorized to control the user's playback
        "Authorization": `Bearer ${spotifyData.accessToken}`
      }
  };

  // send the PUT request!
  request.put(options, 
    // The callback function for when Spotify responds
    (err, postres, body) => {
      if (err) {
          return console.log(err);
      }
      console.log("Pause response :", postres.statusCode);
      console.log(body);
  });
}

app.get("/user/changeVolume", changeVolume);

function changeVolume(req, res, next) {
   
  let cmd = "select SpotifyData from UsersTable where rowIdNum= ?";
  usersdb.get(cmd, req.query.rowid, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      // console.log("Spotify data found: ", row); 
      changeVolumeAPIRequest(row, req.query.volume, res);
    }
  }); 
} 

function changeVolumeAPIRequest(row, volume, res) {
  let spotifyData = JSON.parse(row.SpotifyData);
  
  let url = "https://api.spotify.com/v1/me/player/volume" + "/?volume_percent="+volume;
  console.log(url)
  let body = {"volume_percent": volume}

  const options = {
      url: url,
      json: true,
      body: body,
      headers: {
        // give them the user's token so they know we are authorized to control the user's playback
        "Authorization": `Bearer ${spotifyData.accessToken}`
      }
  };

  // send the PUT request!
  request.put(options, 
    // The callback function for when Spotify responds
    (err, postres, body) => {
      if (err) {
          return console.log(err);
      }
      console.log("volume response: ", postres.statusCode);
      console.log("volume response: ", body);

  });
  
}

var playlist = [
  ]

// Update all user's playlist when a new song is added
app.post("/songAdded", function(req, res) {
  console.log("Song added")
  playlist.push(req.body);
  var updateUserPlaylists = {messageType: "playlistUpdated", playlist: playlist};
  broadcast(JSON.stringify(updateUserPlaylists));

});

app.get("/user/getPlaylist", function (req, res) {
  console.log("Current playlist sent")
  res.send(JSON.stringify(playlist))
});
// ^^^^^^^^^^^^^^^^^^^^^Our gets^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// ----------------------Database setup------------------------------

let cmd =" SELECT name FROM sqlite_master WHERE type='table' AND name='UsersTable' ";
usersdb.get(cmd, function(err, val) {
    if (val == undefined) {
      console.log("No database file - creating one");
      createDB()
    } else {
      console.log("Database file found");
    }
});

    
function createDB() {
  let cmd = "CREATE TABLE UsersTable ( rowIdNum INTEGER PRIMARY KEY, SpotifyId TEXT, SpotifyData TEXT)";
  usersdb.run(cmd, function(err, val) {
    if (err) {
      console.log("Database creation failure", err.message);
    } else {
      console.log("Created database");
    }
  });
}

function gotProfile(accessToken, refreshToken, expires_in, profile, done) {
  console.log("current acccessToken", accessToken);
  var userObj = new Object();

  userObj.profileID = profile.id;
  userObj.accessToken = accessToken;
  userObj.refreshToken = refreshToken;
  var spotifyData = JSON.stringify(userObj);
  let cmd = "select rowIdNum from UsersTable where SpotifyId = ?";
  usersdb.get(cmd, profile.id, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
      new Error("An error has occurred");
    } else if (row == undefined) {
      console.log("User row not found, creating user row", row);
      setupUserRow(profile.id, spotifyData, done);
    } else {
      console.log("User row found: ", row.rowIdNum);
      updateUserRow(row.rowIdNum, spotifyData, null)
      done(null, row.rowIdNum);
    }
  });
}


// Create user row then select that row to return in done
function setupUserRow(spotifyId, spotifyData, done) {
  cmd = "INSERT INTO UsersTable ( SpotifyId, SpotifyData) VALUES (?,?) ";
  usersdb.run(cmd, spotifyId, spotifyData, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
      new Error("An error has occurred");
    } else {
      let cmd = "select rowIdNum from UsersTable where SpotifyId = ?";
      usersdb.get(cmd, spotifyId, function(err, row) {
        if (err) {
          console.log("Database reading error", err.message);
          new Error("An error has occurred");
        } else {
          console.log("User row found: ", row.rowIdNum);
          done(null, row.rowIdNum);
        }
      });
    } 
  });
}

function updateUserRow(rowIdNum, spotifyData, callback) {
  let cmd = "UPDATE UsersTable SET SpotifyData = ? WHERE rowIdNum = ?";
  usersdb.get(cmd, spotifyData, rowIdNum, function(err, row) {
    if (err) {
      console.log("Database reading error", err.message);
      new Error("An error has occurred");
    } else {
      console.log("User row ", rowIdNum, " successfully updated");
    } 
  });
}
// ^^^^^^^^^^^^^^^^^^^^^Database stuff^^^^^^^^^^^^^^^^^^^^^

// listen for requests :)
var listener = server.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
