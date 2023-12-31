require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const mongo = require('mongodb').MongoClient
const bcrypt = require('bcrypt')
var cookieParser = require('cookie-parser')
const uuid = require("node:crypto").randomUUID
app.use(express.json())
app.use(cookieParser())

const {
    addEventToDB,
    getEventFromDB,
    userExists,
    eventExists,
    addUserToDB,
    getUserFromDB,
    getEventsFromDB,
    addEventToUserDB,
} = require('./database.js')

const { isNumberObject } = require('node:util/types')

const url = 'mongodb://127.0.0.1:27017/'
const dbName = 'Volunteer'
const serveRoot = "C:\\Users\\lochy\\OneDrive\\Documents\\GitHub\\Volunteer"

async function startServer() {
    console.log("Starting server...");

    // Open Mongo Connection
    const {client, db, users, events} = await connectDB();

    // Start Express Server

    registerPublicPages();

    registerAuthPages(users);

    registerAppPages(users, events);

	registerAPIEndpoints(users, events);

    app.use((req, res, next) => {
        res.sendFile('./pages/404.html', { root: serveRoot })
    });

    console.log("HTTP server started on port 80");
    console.log("http://localhost:80/");
    app.listen(80);
}

async function connectDB() {
    const client = await mongo.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

    const db = client.db(dbName);
    const users = db.collection('Users');
    const events = db.collection('Events');

    return {client, db, users, events};
}

async function registerPublicPages() {
    app.get('/', (req, res) => {
        res.sendFile('./pages/index.html', { root: serveRoot })
    });

    app.get('/register', (req, res) => {
        res.sendFile('./pages/register.html', { root: serveRoot })
    });

    app.get('/login', (req, res) => {
        res.sendFile('./pages/login.html', { root: serveRoot })
    });

    // register static files
    app.use(express.static('resources'))
}

async function registerAuthPages(DBCollection) {
    app.post('/auth/register', async(req, res) => {

        if (!req.body.username || !req.body.password) {
            res.status(400).json({
                message: "Please provide a username and / or password"
            })

            return;
        }

        const { username, password, email, phone_number, user_type } = req.body;

        // TODO: ensure all inputs are valid
    
        const isUsernameTaken = await userExists(username, DBCollection);

        if (isUsernameTaken == true) {
            res.status(400).json({ error: 'Username already exists' })

            return;

        } else if (isUsernameTaken == false) {
            const hash = await bcrypt.hash(password, 10)

            addUserToDB(username, hash, email, phone_number, user_type, DBCollection)

            res.status(200).json({ message: 'User created' })

        } else {
            res.status(500).json({ error: 'Something went wrong' })
        }
    })

    app.post('/auth/token', (req, res) => {
    
        const refreshToken = req.body.token

        if (refreshToken == null)
            return res.sendStatus(401)

        if (!refreshTokens.includes(refreshToken))
            return res.sendStatus(403)
    
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403)

            const accessToken = generateAccessToken({ name: user.name })

            res.cookie('accessToken', accessToken, { httpOnly: true, overwrite: true })
        })
    })
    
    // Delete the refresh token from the array of refresh tokens
    app.delete('/auth/logout', (req, res) => {
        refreshTokens = refreshTokens.filter(token => token !== req.body.token)
        res.sendStatus(204)
    })
    
    app.post('/auth/login', async(req, res) => {
        const {username, password} = req.body;

        if (!username || !password)
            return res.status(401).json({ error: 'Please provide a username and / or password' });

        const doesUsernameExist = await userExists(username, DBCollection);

        if (doesUsernameExist == true) {

            const userCredentials = await getUserFromDB(username, DBCollection)
            const storedHashedPassword = userCredentials[0].password

            const passwordIsValid = await bcrypt.compare(password, storedHashedPassword)

            if (passwordIsValid) {
                const accessToken = generateAccessToken({ name: username })
                const refreshToken = jwt.sign({ name: username }, process.env.REFRESH_TOKEN_SECRET)

                // TODO: Remove this and its implementation
                //refreshTokens.push(refreshToken)

                res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'strict' })
                res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' })

                res.send().status(200)
            } else {
                res.status(401).json({ error: 'Invalid credentials' })
            }
        } else {
            res.status(400).json({ error: 'User does not exist' })
        }
    })

}

async function registerAPIEndpoints(userCollection, eventCollection) {
    app.post('/api/event/create', authenticateToken, async (req, res) => {
        if (
            !req.body.title ||
            !req.body.description ||
            !req.body.location ||
            !req.body.commitment ||
            !req.body.date ||
			!req.body.tags
        ) {
            res.status(400).json({message: "Please provide all required fields"});
            return;
        }

        if (req.body.commitment == "once") {
            if (!req.body.time) {
                res.status(400).json({message: "Please provide all required fields"});
                return;
            }
        }

        const username = getUser(req.cookies.accessToken);

        const user = await getUserFromDB(username, userCollection);
        const permissionLevel = user[0].user_type;

        if (permissionLevel == 0) {
            res.status(403).json({
                message: "You need to be an organization to create events"
            });
            return;
        }

        const { title, description, location, date, time, tags, commitment, info } = req.body;
        // if the info url doesnt start with http:// or https:// then add it
        if (info != undefined && !info.startsWith("http://") && !info.startsWith("https://")) {
            info = "http://" + info;
        }

        const event_id = uuid();

        const event = {
            event_id: event_id,
            event_title: title,
            event_description: description,
            event_commitment: commitment,
            event_location: location,
            event_date: date,
            event_time: time || null,
            event_tags: tags,
            event_creator: username,
            event_info: info,
            signups: []
        }

        addEventToDB(event, eventCollection);

        addEventToUserDB(event_id, username, userCollection);

        res.status(200).send({event_id: event_id});

    });

    app.get("/api/user/:username/", authenticateToken, async (req, res) => {
        const username = req.params.username;

        if (!username || username == null || username == undefined || username == '') {
            res.send(400).json({ error: 'Please provide a username' })
            return;
        }

        if (await userExists(username, userCollection) == false) {
            res.sendStatus(404);
            return;
        }

        const accessor = getUser(req.cookies.accessToken);

        const permissionLevel = await userPermissions(username, accessor, userCollection);

        const DBdata = await getUserFromDB(username, userCollection);

        if (DBdata == null) {
            console.log("Something went wrong with getting userdata from the db");
            res.sendStatus(500);
            return;
        }

        const cleanDBData = filterUserdata(DBdata[0], permissionLevel);

        if (cleanDBData == null) {
            console.log("Something went from with cleaning the userdata");
            res.sendStatus(500);
            return;
        }

        res.send(cleanDBData).status(200);

    })

    app.get("/api/event/:event_id/", authenticateToken, async (req, res) => {
        const event_id = req.params.event_id;

        if (!event_id || event_id == null || event_id == undefined || event_id == '') {
            res.send(400).json({ error: 'Please provide an event_id' })
        }

        if (eventExists(event_id, eventCollection) == false) {
            res.sendStatus(404);
        }

        const DBdata = await getEventFromDB(event_id, eventCollection);

        if (DBdata == null) {
            console.log("Something went wrong with getting eventdata from the db");
            res.sendStatus(500);
        }

        res.send(DBdata[0]).status(200);

    });

    app.get("/api/events/:number/", authenticateToken, async (req, res) => {
        const number = Number(req.params.number);

        if (!number || number == null || number == undefined || number == '' || isNaN(number)) {
            res.send(400).json({ error: 'Please provide a number' })
        }

        const DBdata = await getEventsFromDB(number, eventCollection);

        if (DBdata == null) {
            console.log("Something went wrong with getting eventdata from the db");
            res.sendStatus(500);
        }

        res.send(DBdata).status(200);

    });

    app.post("/api/signup/:event_id/", authenticateToken, async (req, res) => {
        const event_id = req.params.event_id;

        if (!event_id || event_id == null || event_id == undefined || event_id == '') {
            res.send(400).json({ error: 'Please provide an event_id' })
        }

        if (await eventExists(event_id, eventCollection) == false) {
            res.sendStatus(404);
        }

        const username = getUser(req.cookies.accessToken);

        const DBdata = await getEventFromDB(event_id, eventCollection);

        if (DBdata == null) {
            console.log("Something went wrong with getting eventdata from the db");
            res.sendStatus(500);
        }

        const event = DBdata[0];

        if (event.signups.includes(username)) {
            res.send({error: "You are already attending this event."}).status(403);
            return;
        }

        event.signups.push(username);

        eventCollection.updateOne({ event_id: event_id }, { $set: { signups: event.signups } });

        res.send({}).status(200);

    });
}

async function registerAppPages(userCollection, eventCollection) {

    app.get('/app/', authenticateToken, (req, res) => {
        res.sendFile('./app/homepage.html', { root: serveRoot })
    });

    app.get('/app/settings/', authenticateToken, (req, res) => {
        const user = getUser(req.cookies.accessToken)

        res.redirect(`/app/user/${user}`)
    });

    app.get('/app/create/', authenticateToken, (req, res) => {
        res.sendFile('./app/createEvent.html', { root: serveRoot })
    });

    app.get("/app/user/*", authenticateToken, async (req, res) => {
        res.sendFile('./app/user.html', { root: serveRoot })
    });

    app.get("/app/event/*", authenticateToken, async (req, res) => {
        res.sendFile('./app/event.html', { root: serveRoot })
    });
}

function getUser(token) {
    let User;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err)
            return null;

        User = user;
    })
    return User.name;
}

// Permission ranges from 0 to 2
// 0 is a regular user accessing another users profile
// 1 is a moderator accessing a users profile
// 2 is an admin accessing a users profile or a user accessing their own profile
async function userPermissions(username, accessingUsername, collection) {
    if (username == accessingUsername) {
        return 2;
    }

    const result = await getUserFromDB(username, collection)

    if (result[0].user_type == 3) // 3 is admin, 2 is moderator, 1 is organization, 0 is volunteer
        return 2;
    else if (result[0].user_type == 2)
        return 1;

    return 0;

    return false;
}

function filterUserdata(userdata, permissionLevel) {

    // We always want to delete the password from the data as even the user should have access to the hashed password.
    delete userdata["password"]

    switch (permissionLevel) {
        case 0:
            delete userdata["email"]
            delete userdata["phone_number"]
            break;
        case 1:
            delete userdata["email"]
            delete userdata["phone_number"]
            break;
        case 2:
            // TODO: add something to tell the user page that they can change their password
            break;
        default:
            console.log("Something went wrong at filtering user data");
            userdata = null;
            break;
    }

    return userdata;

}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TIME })
}

function authenticateToken(req, res, next) {
    const token = req.cookies.accessToken;

    if (token === null)
        return res.sendStatus(401).redirect('/login');

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err)
            return res.sendStatus(403);

        req.user = user;

        // Continue to the next middleware function
        next();
    })
}

startServer();