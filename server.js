const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let rooms = {};

io.on("connection", socket => {

  socket.on("joinRoom", room => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: {} };
    }

    rooms[room].players[socket.id] = {
      x: Math.random() * 300,
      y: 300
    };

    io.to(room).emit("updatePlayers", rooms[room]);
  });

  socket.on("move", ({room, x}) => {
    if (rooms[room]?.players[socket.id]) {
      rooms[room].players[socket.id].x = x;
      io.to(room).emit("updatePlayers", rooms[room]);
    }
  });

  socket.on("disconnect", () => {
    for (let room in rooms) {
      delete rooms[room].players[socket.id];
    }
  });

});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running"));
