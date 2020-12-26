//EXPRESS
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// FOLDER ZA CSS, JS I DRUGE FAJLOVE
app.use(express.static("public"));

// ZA DELETE I PUT METODE
var methodOverride = require('method-override'); // za delete i put http metode
app.use(methodOverride("_method"));

// KONEKTOVANJE SA CASSANDROM

const { Client } = require("cassandra-driver");
const { Console } = require('console');
const client = new Client({
      cloud: {
        secureConnectBundle: "secure-connect-naprednebaze.zip",
      },
      credentials: { username: "stefkos98", password: "QP54R3gvcsmA!V@" },
    });
async function run() {
 
    await client.connect();
  }


// STARTOVANJE SERVERA
app.listen(3000, async function () {
    console.log("Listening on port 3000");
    run();
    const rs = await client.execute("SELECT * FROM rbus.\"Guest\"");
    rs.rows.forEach(row=>{
        console.log(row);
    })
});
// GASENJE APP

process.stdin.resume();//so the program will not close instantly

async function exitHandler(options, exitCode) {
    if (exitCode || exitCode === 0) {
        console.log("Goodbye");
    }
    await client.shutdown();
    process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));