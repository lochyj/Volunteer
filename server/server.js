require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const mongo = require('mongodb').MongoClient
const bcrypt = require('bcrypt')
var cookieParser = require('cookie-parser')
var fs = require('node:fs')
app.use(express.json())
app.use(cookieParser())

const url = 'mongodb://127.0.0.1:27017/'
const dbName = 'Volunteer'
const serveRoot = "C:\\Users\\lochy\\OneDrive\\Documents\\GitHub\\Volunteer"

async function startServer() {
    console.log("Starting server...");

    // Open Mongo Connection
    const {client, db, users} = await connectDB();

    // Start Express Server

    registerPublicPages();

    registerAuthPages(users);

    registerAppPages(users);

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

async function registerAppPages(DBCollection) {

    app.get('/app/', authenticateToken, (req, res) => {
        res.sendFile('./app/homepage.html', { root: serveRoot })
    });

    app.get('/app/dashboard/', authenticateToken, (req, res) => {
        res.sendFile('./app/dashboard.html', { root: serveRoot })
    });

    app.get('/app/settings/', authenticateToken, (req, res) => {
        res.sendFile('./app/settings.html', { root: serveRoot })
    });

    app.get('/app/user/:username/', authenticateToken, async (req, res) => {
        const username = req.params.username;

        if (!username) {
            res.redirect('/app/');
        }

        const userFile = await SSRUserPage(username, getUser(req.cookies.accessToken), DBCollection);

        if (userFile == null) {
            res.status(500).json({ error: 'Something went wrong' })
            return;
        }

        res.send(userFile);

    });
}

async function SSRUserPage(username, accessor, DBCollection) {

    if (userExists(username, DBCollection) == false)
        return null;

    const permissionLevel = await userPermissions(username, accessor, DBCollection);

    const DBdata = await getUserFromDB(username, DBCollection);

    const cleanDBData = filterUserdata(DBdata[0], permissionLevel);

    if (cleanDBData == null)
        return null;

    const userFile = fs.readFileSync('./app/user.html', 'utf8');

    const file = userFile.replace(`"//..%&&%..//"`, JSON.stringify(cleanDBData));

    return file;

}

function getUser(token) {
    let User;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return null;
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
    switch (permissionLevel) {
        case 0:
            userdata.email = "";
            userdata.phone_number = "";
            userdata.password = "";
            break;
        case 1:
            userdata.email = "";
            userdata.phone_number = "";
            userdata.password = "";
            break;
        case 2:
            // TODO: add something to tell the user page that they can change their password
            userdata.password = "";
            break;
        default:
            console.log("Something went wrong at filtering user data");
            userdata = null;
            return userdata;
    }

    return userdata;

}

async function userExists(username, collection) {
    const arr = await collection.find({ username: username }).toArray();

    if (arr.length > 0) {
        return true;
    } else if (arr.length == 0) {
        return false;
    } else {
        return null;
    }

}

function addUserToDB(username, password, email, phoneNumber, userType, collection) {

    collection.insertOne({ username: username, password: password, email: email, phone_number: phoneNumber, user_type: userType }, (err, result) => {

        if (err) {
            mongoError(err, "addUserToDB - collection.insertOne");
        }

        console.log(result);

    })
}

async function getUserFromDB(username, collection) {
    const data = await collection.find({ username: username }).toArray().then(data=>data).catch(err=>err);

    return data;

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