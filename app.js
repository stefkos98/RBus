//EXPRESS
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var uuidBuffer = require('uuid-buffer');
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

app.get("/", function (req, res) {
  res.render("home.ejs", { user: req.user });
});

app.post("/", async function (req, res) {
  const povratna = req.body.povratna;
  const polaziste = req.body.polaziste;
  const odrediste = req.body.odrediste;
  const datum1 = req.body.datum1.toString();
  const datum2 = req.body.datum2.toString();
  const brputnika = req.body.brputnika;
  let prevoznik = req.body.prevoznik;
  if(prevoznik=='') prevoznik=undefined;

  var tabela1=[];
  var tabela2=[];
  if(povratna=="NE" && prevoznik == undefined)
  {
    const IDlinije = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
   console.log(uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer));
    const tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,imeprevoznika, \"TerminID\" FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "'");
    
    tabela.rows.forEach(async element => {
      if((element.mesta-element.popunjena)>=brputnika)
          tabela1.push(element);
    });
    console.log(tabela1);
    
  }
  else if(povratna=="NE" && prevoznik != undefined)
  {
    const IDlinije = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
   
    const tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, \"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "' AND imeprevoznika='"+prevoznik+"'");
    
    tabela.rows.forEach(async element => {
      if((element.mesta-element.popunjena)>=brputnika)
          tabela1.push(element);
    });
    console.log(tabela1);
    
  }
  else if(povratna=="DA" && prevoznik == undefined)
  {
    let IDlinije = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
   
    let tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, imeprevoznika,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "'");
    
    tabela.rows.forEach(async element => {
      if((element.mesta-element.popunjena)>=brputnika)
          tabela1.push(element);
    });
    console.log(tabela1);
    
    IDlinije = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + odrediste + "' AND cilj='" + polaziste + "'");

    tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, imeprevoznika,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer) + " AND datum='" + datum2 + "'");
    
    tabela.rows.forEach(async element => {
      if((element.mesta-element.popunjena)>=brputnika)
          tabela2.push(element);
    });
    console.log(tabela2);
  }
  else
  {
    let IDlinije = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
   
    let tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "' AND imeprevoznika='"+prevoznik+"'");
    
    tabela.rows.forEach(async element => {
      if((element.mesta-element.popunjena)>=brputnika)
          tabela1.push(element);
    });
    console.log(tabela1);
    
    IDlinije = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + odrediste + "' AND cilj='" + polaziste + "'");

    tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDlinije.rows[0].LinijaID.buffer) + " AND datum='" + datum2 + "' AND imeprevoznika='"+prevoznik+"'");
    
    tabela.rows.forEach(async element => {
      if((element.mesta-element.popunjena)>=brputnika)
          tabela2.push(element);
    });
    console.log(tabela2);

  }
  res.render("rezultat.ejs", { user: req.user, brputnika, polaziste, odrediste, datum1, datum2, prevoznik, povratna, termini1: tabela1, termini2: tabela2});
});
//rezervacija

app.put("/rezervisi/:id/:brputnika/:mesta/:TerminID", async function (req, res) {
  req.flash("success", "Uspesna rezervacija!");
  res.redirect('back');
              
});

app.put("/rezervisi/:brputnika/:mesta/:TerminID", async function (req, res) {
  req.flash("error", "Ulogujte se da biste rezervisali termin!");
  res.redirect('back');
});

app.get("/autoprevoznici", async function (req, res) {
  const rs = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\"");
  console.log(rs.rows.length);
  res.render("autoprevoznici.ejs", { user: req.user, prevoznici: rs.rows });
});
// STARTOVANJE SERVERA
app.listen(3000, async function () {
  console.log("Listening on port 3000");
  run();
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
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));