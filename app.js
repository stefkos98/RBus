//EXPRESS
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// buffer to uuid
const uuidBuffer = require('uuid-buffer');

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
// PROFIL ZA KORISNIKA I PREVOZNIKA
app.get("/profile",async function(req,res){
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'"+req.user.email+"\'");
  if(postojiemail.rows.length>0)
  {
    var linijebaza=await client.execute(`SELECT * FROM rbus."Linija"`);
    // console.log(uuidBuffer.toString(postojiemail.rows[0].AutoprevoznikID.buffer));
    var rs=await client.execute(`SELECT * FROM rbus."Termin"` );
    var linije=[];
    var termini=[];

    // ZA PROVERU DA LI JE DATI TERMIN VEC PROSAO
    var today = new Date();
    var x=today.getMonth()+1;
    if(x<10) x="0"+x;
    var y=today.getDate();
    var z=today.getHours();
    var q=today.getMinutes();
    if(z<10) z="0"+z;
    if(q<10) q="0"+q;
    var time=z+":"+q;
    if(y<10)
    y="0"+y;
    var date = today.getFullYear()+'-'+x+'-'+y;

    for(var i=0;i<rs.rows.length;i++)
    {
      if(rs.rows[i].AutoprevoznikID==req.user.AutoprevoznikID)
      {
        if(rs.rows[i].datum>date ||(rs.rows[i].datum==date && rs.rows[i].vreme>=time))
        {var indeks=linije.indexOf(uuidBuffer.toString(rs.rows[i].LinijaID.buffer));
      if(indeks==-1)
      {
        linije.push(uuidBuffer.toString(rs.rows[i].LinijaID.buffer));
        termini.push([]);
        termini[termini.length-1].push(rs.rows[i]);
      }
      else
      {
        termini[indeks].push(rs.rows[i]);
      }
      }
    }
    }
    for(var i=0;i<linijebaza.rows.length;i++)
    {
      var indeks=linije.indexOf(uuidBuffer.toString(linijebaza.rows[i].LinijaID.buffer));
      if(indeks!=-1)
      {
        linije[indeks]=linijebaza.rows[i];
      }
    }
    res.render("profile_prevoznik.ejs",{user:req.user,linije:linije,termini:termini});
  }
  else
  {
    postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'"+req.user.email+"\'");
    if(postojiemail.rows.length>0)
    {
      var termini=[];
      var rezervacije=await client.execute(`SELECT * FROM rbus."Rezervacija" WHERE "userID"=${req.user.id}`);
      for(var i=0;i<rezervacije.rows.length;i++)
      {
        var termin=await client.execute(`SELECT * FROM rbus."Termin" WHERE "LinijaID"=${uuidBuffer.toString(rezervacije.rows[i].LinijaID.buffer)} AND datum='${rezervacije.rows[i].datum}' AND imeprevoznika='${rezervacije.rows[i].imeprevoznika}' AND "TerminID"=${rezervacije.rows[i].TerminID}`);
        termini.push(termin.rows);
      }
      res.render("profile_korisnik.ejs",{user:req.user,rezervacije:rezervacije.rows,termini:termini[0]});
    }
    else
    {
      req.flash("error","Ulogovani korisnik ne postoji u bazi");
      res.redirect("/",{user:req.user,termini:null});
    }
  }
})
// BRISANJE POLASKA
app.delete("/profile/prevoznik/:termin",async function(req,res){
  var terminparse=JSON.parse(req.params.termin);
  // brisanje termina
  await client.execute(`DELETE FROM rbus."Termin" WHERE "LinijaID"=${terminparse.LinijaID} AND "datum"='${terminparse.datum}' AND imeprevoznika='${terminparse.imeprevoznika}' AND "TerminID"=${terminparse.TerminID} `);
  var IDresuser=await client.execute(`SELECT * FROM rbus."TerminRezervacija" WHERE "TerminID"=${terminparse.TerminID}`);
  // brisanje rezervacija
  for(var i=0;i<IDresuser.rows.length;i++)
  {
    await client.execute(`DELETE FROM rbus."Rezervacija" WHERE "userID"=${uuidBuffer.toString(IDresuser.rows[i].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[i].resID.buffer)} AND "TerminID"=${terminparse.TerminID}`);
    // brisanjte terminrezervacija
  await client.execute(`DELETE FROM rbus."TerminRezervacija" WHERE "TerminID"=${terminparse.TerminID} AND  "userID"=${uuidBuffer.toString(IDresuser.rows[i].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[i].resID.buffer)}`);
  }
  // brisanje sedista
  var sedista=  await client.execute(`SELECT * FROM rbus."Sedista" WHERE "TerminID"=${terminparse.TerminID}`);
  for(var i=0;i<sedista.rows.length;i++)
  {
    await client.execute(`DELETE FROM rbus."Sedista" WHERE "TerminID"=${terminparse.TerminID} AND brojsedista=${sedista.rows[i].brojsedista}`);
  }
  

    req.flash("success","Termin je uspesno obrisan");
    res.redirect("/profile");
})
// PROMENA PODATAKA O PREVOZNIKU
app.put("/profile/prevoznik/edit/:email",async function (req,res){
  var x = req.params.email;
  var prevoznik=await client.execute(`SELECT * FROM rbus."Autoprevoznik" WHERE email='${x}'`);
 
          const t = await bcrypt.compare(req.body.password, prevoznik.rows[0].password);
          if (!t) {
              req.flash("error", "Uneli ste pogresnu sifru. Podaci nisu promenjeni!");
              res.redirect("/profile");
          }
          else {
              if (req.body.password2 != "") {
                  var newpassword = await bcrypt.hash(req.body.password2, 8);
              }
              else
              {
                newpassword=prevoznik.rows[0].password;
              }
              await client.execute(`UPDATE rbus."Autoprevoznik" SET password='${newpassword}',telefon='${req.body.telefon}' WHERE email='${x}' AND "AutoprevoznikID"=${uuidBuffer.toString(prevoznik.rows[0].AutoprevoznikID.buffer)}`);
              var user = await client.execute(`SELECT * FROM rbus."Autoprevoznik" WHERE email='${req.params.email}'`);
              req.login(user.rows[0], function (err) {
                if(err) return next(err);
              });
              req.flash("success", "Uspesno ste izmenili podatke!");
              res.redirect("/profile");
          }
});
//PROMENA PODATAKA O KORISNIKU
app.put("/profile/korisnik/edit/:email",async function (req,res){
  var x = req.params.email;
  var prevoznik=await client.execute(`SELECT * FROM rbus."Korisnik" WHERE email='${x}'`);
 
          const t = await bcrypt.compare(req.body.password, prevoznik.rows[0].password);
          if (!t) {
              req.flash("error", "Uneli ste pogresnu sifru. Podaci nisu promenjeni!");
              res.redirect("/profile");
          }
          else {
              if (req.body.password2 != "") {
                  var newpassword = await bcrypt.hash(req.body.password2, 8);
              }
              else
              {
                newpassword=prevoznik.rows[0].password;
              }
              await client.execute(`UPDATE rbus."Korisnik" SET password='${newpassword}',phone='${req.body.phone}',name='${req.body.name}' WHERE email='${x}' AND id=${uuidBuffer.toString(prevoznik.rows[0].id.buffer)}`);
              var user = await client.execute(`SELECT * FROM rbus."Korisnik" WHERE email='${req.params.email}'`);
              req.login(user.rows[0], function (err) {
                if(err) return next(err);
              });
              req.flash("success", "Uspesno ste izmenili podatke!");
              res.redirect("/profile");
          }
});
// BRISANJE PROFILA KORISNIKA
app.delete("/profile/korisnik/:email",async function (req,res){
  await client.execute(`DELETE FROM rbus."Korisnik" WHERE email='${req.params.email}' and id=${req.user.id}`);
  req.logout();
  req.flash("success","Uspesno ste obrisali nalog :(")
  res.redirect("/");
});

// BRISANJE PROFILA PREVOZNIKA PROVERITI DA LI RADI
app.delete("/profile/prevoznik/:email",async function (req,res){
  await client.execute(`DELETE FROM rbus."Autoprevoznik" WHERE email='${req.params.email}' and "AutoprevoznikID"=${req.user.id}`);
  var rs=await client.execute(`SELECT * FROM rbus."Termin"`);
  //brisanje termina
  for(var i=0;i<rs.rows.length;i++)
  {
    if((uuidBuffer.toString(rs.rows[i].AutoprevoznikID))==req.user.AutoprevoznikID)
    {
      await client.execute(`DELETE FROM rbus."Termin" WHERE "LinijaID"=${uuidBuffer.toString(rs.rows[i].LinijaID)} AND datum='${rs.rows[0].datum}' AND imeprevoznika='${rs.rows[i].imeprevoznika}' AND "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)} AND vreme='${rs.rows[i].vreme}`);
      
      var IDresuser=await client.execute(`SELECT * FROM rbus."TerminRezervacija" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)}`);
      // brisanje rezervacija
      for(var j=0;i<IDresuser.rows.length;j++)
      {
        await client.execute(`DELETE FROM rbus."Rezervacija" WHERE "userID"=${uuidBuffer.toString(IDresuser.rows[j].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[j].resID.buffer)} AND "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)}`);
        // brisanjte terminrezervacija
      await client.execute(`DELETE FROM rbus."TerminRezervacija" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)} AND  "userID"=${uuidBuffer.toString(IDresuser.rows[j].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[j].resID.buffer)}`);
      }
      // brisanje sedista
      var sedista=  await client.execute(`SELECT * FROM rbus."Sedista" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)}`);
      for(var j=0;i<sedista.rows.length;j++)
      {
        await client.execute(`DELETE FROM rbus."Sedista" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[j].TerminID)} AND brojsedista=${sedista.rows[j].brojsedista}`);
      }

    }
  }
  req.logout();
  req.flash("success","Uspesno ste obrisali nalog :(")
  res.redirect("/");
});
//  STRANICA ZA DODAVANJE POLASKA
app.get("/profile/prevoznik/dodajpolazak",async function(req,res){

  res.render("addpolazak.ejs",{user:req.user});
})
// DODAVANJE POLASKA
app.post("/profile/prevoznik/dodajpolazak",async function(req,res){
  var rs=await client.execute(`SELECT * FROM rbus."Linija" WHERE start='${req.body.polaziste}' AND cilj='${req.body.odrediste}'`);
  if(rs.rows.length==0)
  {
    await client.execute(`INSERT INTO rbus."Linija" ("LinijaID",start,cilj) VALUES (uuid(),'${req.body.polaziste}','${req.body.odrediste}')`);
    await client.execute(`INSERT INTO rbus."Linija" ("LinijaID",cilj,start) VALUES (uuid(),'${req.body.polaziste}','${req.body.odrediste}')`);
    rs=await client.execute(`SELECT * FROM rbus."Linija" WHERE start='${req.body.polaziste}' AND cilj='${req.body.odrediste}'`);
  }
  var today = new Date();
  var x=today.getMonth()+1;
  if(x<10) x="0"+x;
  var y=today.getDate();
  if(y<10)
  y="0"+y;
  var date = today.getFullYear()+'-'+x+'-'+y;
  if(req.body.datum<date)
  {
    req.flash("error","Datum mora biti danasnji ili u buducnosti");
    res.redirect("/profile/prevoznik/dodajpolazak");
  }
  else
  {
    await client.execute(`INSERT INTO rbus."Termin" ("TerminID",imeprevoznika,"AutoprevoznikID","LinijaID",mesta,popunjena,vreme,cena,datum,start,cilj) VALUES
    (uuid(),'${req.user.naziv}',${req.user.AutoprevoznikID},${rs.rows[0].LinijaID},${req.body.mesta},0,'${req.body.vreme}',${req.body.cena},'${req.body.datum}','${req.body.polaziste}','${req.body.odrediste}')`);
    req.flash("success","Uspesno ste dodali novi polazak");
  }
  res.redirect("/profile");
})
app.delete("/profile/korisnik/:email/:resid",async(req,res)=>{
var rs=await client.execute(`SELECT * from rbus."Rezervacija" WHERE "userID"=${req.user.id} AND "resID"=${req.params.resid}`);
var sediste=rs.rows[0].brojsedista;
await client.execute(`DELETE from rbus."Rezervacija" WHERE "userID"=${req.user.id} AND "resID"=${req.params.resid} and "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)}`);
rs=await client.execute(`SELECT * FROM rbus."Termin" WHERE "LinijaID"=${uuidBuffer.toString(rs.rows[0].LinijaID.buffer)} AND "datum"='${rs.rows[0].datum}' AND imeprevoznika='${rs.rows[0].imeprevoznika}' AND "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)}`);
// OSLOBADJANJE SEDISTA
await client.execute(`DELETE FROM rbus."Sedista" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)} AND brojsedista=${sediste}`);
var novibroj=rs.rows[0].popunjena-1;
if(novibroj<0)
{
  novibroj=12;
}
await client.execute(`UPDATE rbus."Termin" SET popunjena=${parseInt(novibroj)} WHERE "LinijaID"=${uuidBuffer.toString(rs.rows[0].LinijaID.buffer)} AND "datum"='${rs.rows[0].datum}' AND imeprevoznika='${rs.rows[0].imeprevoznika}' AND "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)} AND vreme='${rs.rows[0].vreme}'`);
req.flash("success","Uspesno obrisana rezervacija");
res.redirect("/profile");
})


  app.get("/", function (req, res) {
    res.render("home.ejs", { user: req.user });
});

app.get("/rentabus", function (req, res) {
  res.render("rentabus.ejs", { user: req.user });
});

app.get("/autoprevoznici", async function (req, res) {
  const rs = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\"");
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