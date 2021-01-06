//EXPRESS
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// FOLDER ZA CSS, JS I DRUGE FAJLOVE
app.use(express.static("public"));

//FLASH PORUKE
app.use(require('express-session')({ secret: "Passport do pobede", resave: false, saveUninitialized: false }));
var flash = require('connect-flash'); // za prikaz flash poruka niste ulogovani itd(kad se uradi i logovanje)
app.use(flash());
//  FLASH poruke vidljive svim metodama
app.use((req, res, next) => {
    res.locals.message = req.flash("success");
    res.locals.error = req.flash("error");
    next();

});

// ZA DELETE I PUT METODE
var methodOverride = require('method-override'); // za delete i put http metode
app.use(methodOverride("_method"));

var validator = require('validator');
var bcrypt = require('bcryptjs');

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

// PASSPORT LOGIN

// PASSPORT VERZIJA
var passport = require('passport');
var localStrategy = require('passport-local');
app.use(passport.initialize());
app.use(passport.session());
// PASSPORT SERIJALIZACIJA I DESERIJALIZACIJA USERA
passport.serializeUser(function (user, done) {
    return done(null, user);
});
passport.deserializeUser(function (user, done) {
    if (user != null)
        return done(null, user);
});
passport.use('autoprevozniklocal', new localStrategy({ usernameField: 'email' }, async function (username, password, done) {
  const rs =  await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'"+username+"\'");
  for(var i=0;i<rs.rows.length;i++)
  {
    if(rs.rows[i].email!=username)
    {
      return done(null, false, { message: 'Incorrect username.' });
    }
    const t = await bcrypt.compare(password, rs.rows[i].password);
    if (!t) return done(null, false, { message: 'Incorrect password' });
    return done(null, rs.rows[i]);
  }
  return done(null, false, { message: 'Incorrect username.' });
}));
passport.use('korisniklocal', new localStrategy({ usernameField: 'email' }, async function (username, password, done) {
  const rs =  await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'"+username+"\'");
  for(var i=0;i<rs.rows.length;i++)
  {
    if(rs.rows[i].email!=username)
    {
      return done(null, false, { message: 'Incorrect username.' });
    }
    const t = await bcrypt.compare(password, rs.rows[i].password);
    if (!t) return done(null, false, { message: 'Incorrect password' });    
    return done(null, rs.rows[i]);
  }
      return done(null, false, { message: 'Incorrect username.' });
}));
//LOGIN

app.get("/login", function (req, res) {
  if (req.user != undefined) {
      req.flash("error", "Vec ste ulogovani");
      res.redirect("/");
  }
  else res.render('login.ejs', { user: req.user });
});
app.post('/login', passport.authenticate(["autoprevozniklocal","korisniklocal"], { successRedirect: "/", failureRedirect: "/login" }), (req, res) => { });

app.get('/logout', (req, res) => { req.logout(); req.flash("success", "Uspesna odjava"); res.redirect('/') });

app.get("/register", (req, res) => {
  if (req.user != undefined) {
      req.flash("error", "Vec ste ulogovani");
      res.redirect("/");
  }
  res.render("registration.ejs", { user: req.user });
});

app.post("/register", async function (req, res) {
  if (req.user != undefined) {
      req.flash("error", "Vec ste ulogovani");
      res.redirect("/");
  }
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'"+req.body.email+"\'");
  if (postojiemail.rows.length>0)
      postojiemail = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'"+req.body.email+"\'");
  var postojiusername = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'"+req.body.username+"\'");
  if (postojiusername.rows.length>0)
      postojiusername = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'"+req.body.username+"\'");
  if (!validator.isEmail(req.body.email) || postojiemail.rows.length>0) {
 
    req.flash("error", "Email nije validan!");
      res.redirect("/register");
  }
  else {

      if (postojiusername.rows.length>0) {
          req.flash("error", "Vec postoji korisnik sa tim username-om, izaberite drugi!");
          res.redirect("/register");
      }
      else {
          var pattern = /^06\d{7,8}$/;
          if (pattern.test(req.body.telefon) == false) {
             req.flash("error", "Pogresan format telefona!");
              res.redirect("/register");
          }
          else 
          {
                  if(req.body.tip=='korisnik')
                  {
                    await client.execute(`INSERT INTO rbus.\"Korisnik\" (id,username,password,name,phone,email) VALUES (uuid(),\'${req.body.username}\',\'${await bcrypt.hash(req.body.password,8)}\',\'${req.body.name}\',\'${req.body.telefon}\',\'${req.body.email}\')` );
                  }
                  else
                  {
                    await client.execute(`INSERT INTO rbus.\"Autoprevoznik\" (\"AutoprevoznikID\",username,password,email,naziv,telefon) VALUES (uuid(),\'${req.body.username}\',\'${await bcrypt.hash(req.body.password,8)}\',\'${req.body.email}\',\'${req.body.name}\',\'${req.body.telefon}\')` );

                  }
                  req.flash("success", "Uspesna registracija, sada se mozete ulogovati!");
                  res.redirect("/");
          }
      }
      }
});

app.get("/profile",async function(req,res){
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'"+req.user.email+"\'");
  if(postojiemail.rows.length>0)
  {
    res.render("profile_prevoznik.ejs",{user:req.user,termini:null});
  }
  else
  {
    postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'"+req.user.email+"\'");
    if(postojiemail.rows.length>0)
    {
      res.render("profile_korisnik.ejs",{user:req.user,termini:null});
    }
    else
    {
      req.flash("error","Ulogovani korisnik ne postoji u bazi");
      res.redirect("/",{user:req.user,termini:null});
    }
  }
})

app.put("/profile/korisnik/:email",async function (req,res){

});
app.delete("/profile/korisnik/edit/:email",async function (req,res){

});

app.put("/profile/korisnik/:email",async function (req,res){

});
app.delete("/profile/korisnik/edit/:email",async function (req,res){

});

  app.get("/", function (req, res) {
    res.render("home.ejs", { user: req.user });
});

app.get("/rentabus", function (req, res) {
  res.render("rentabus.ejs", { user: req.user });
});

app.get("/autoprevoznici", async function (req, res) {
  const rs = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\"");
  console.log(rs.rows.length);
  res.render("autoprevoznici.ejs", { user: req.user, prevoznici:rs.rows  });
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
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));