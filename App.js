const express = require("express");
const app = express();

// Server config
const PORT_NUMBER = 4000;
const server = app.listen(PORT_NUMBER, () => {
  console.log(
    `Chat Server is running on ${PORT_NUMBER} Process ID: ${process.pid}`
  );
});

const io = require("socket.io").listen(server);
const redis = require("redis"),
  client = redis.createClient();
app.use(express.json());

// User Sign Up and Stored in Redis
app.post("/signup", (req, res) => {
  let { name, username, age, email } = req.body;
  let userdetail = {};
  userdetail.name = name;
  userdetail.username = username;
  userdetail.age = age;
  userdetail.email = email;
  client.set(username, JSON.stringify(userdetail));
  return res.status(200).json({
    message: "added successfully"
  });
});

// Internal API for Chat Server

// Redis Adapter will automatically Handle all process or socket id in clustered Mode.
const redisAdapter = require("socket.io-redis");
io.adapter(redisAdapter({ host: "localhost", port: 6379 }));
// Redis Adapter will automatically Handle all process or socket id in clustered Mode.

// For User Interface of Chat Application
app.get("/chat/:userName", (requst, respone) => {
  respone.sendFile(__dirname + "/Public/index.html");
});

let connections = [];

// Geting UserDetail from API server (App.js) and Sending Back to the Client Html.

io.sockets.on("connection", socket => {
  connections.push(socket);
  console.log(`Connceted ${connections.length}`);

  // Join Private Room
  socket.on("join pv", pv => {
    console.log(pv);
    socket.join(pv.room1);
    socket.join(pv.room2);
  });

  // Getting Current User name from Client Side
  socket.on("current user", currentuser => {
    console.log(currentuser);
    client.set(socket.id, currentuser);
  });

  socket.on("send message", async (data, callback) => {
    console.log(data);

    client.get(socket.id, (err, username) => {
      // Fetching Username by socketId from redis.
      client.get(username, (err, userDetail) => {
        if (err) console.log(err.message);
        // From Username getting User Details from redis.
        console.log(userDetail);
        io.to(data.room).emit("new message", {
          msg: data.message,
          userDetail: JSON.parse(userDetail)
        });
        callback();
      });
    });
  });

  socket.on("disconnect", data => {
    client.del(socket.id);
    connections.splice(connections.indexOf(socket), 1);
    console.log(`Disconnected ${connections.length}`);
  });
});
