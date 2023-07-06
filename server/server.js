require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const mongo = require('mongodb').MongoClient
const bcrypt = require('bcrypt')
var cookieParser = require('cookie-parser')
app.use(express.json())
app.use(cookieParser())

const url = 'mongodb://127.0.0.1:27017'
const dbName = 'Volunteer'
const serveRoot = "C:\\Users\\lochy\\OneDrive\\Documents\\GitHub\\Volunteer"

async function startServer() {
    console.log("Starting server...");

    // Open Mongo Connection
    const client = await mongo.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })

    const db = await client.db(dbName)
    const users = await db.collection('Users')

    // Start Express Server

    // Public facing pages
    app.get('/', (req, res) => {
        res.sendFile('./pages/index.html', { root: serveRoot })
    });

    app.get('/register', (req, res) => {
        res.sendFile('./pages/register.html', { root: serveRoot })
    });

    app.get('/login', (req, res) => {
        res.sendFile('./pages/login.html', { root: serveRoot })
    });

    registerAuthPages(users);

    registerAppPages(users);

    console.log("Server started on port 80");
    console.log("http://localhost:80");
    app.listen(80);
}

async function registerAuthPages(DBCollection) {
    await app.post('/auth/register', async(req, res) => {

        if (!req.body.username || !req.body.password) {
            res.status(400).json({
                message: "Please provide a username and / or password"
            })

            return;
        }

        const { username, password, email, phone_number, user_type } = req.body;

        // TODO: ensure all inputs are valid
    
        const isUsernameTaken = await userExists(username, DBCollection);

        if (isUsernameTaken) {
            res.status(400).json({ error: 'Username already exists' })
            return;
        }
    
        if (!isUsernameTaken) {
            const hash = await bcrypt.hash(password, 10)
    
            addUserToDB(username, hash, email, phone_number, user_type, DBCollection)

            res.status(200).json({ message: 'User created' })
        }
    })
    
    await app.post('/auth/token', (req, res) => {
    
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
    await app.delete('/auth/logout', (req, res) => {
        refreshTokens = refreshTokens.filter(token => token !== req.body.token)
        res.sendStatus(204)
    })
    
    await app.post('/auth/login', async(req, res) => {
        const {username, password} = req.body;

        if (!username || !password)
            return res.status(401).json({ error: 'Please provide a username and / or password' });
    
        const doesUsernameExist = await userExists(username, DBCollection);

        if (doesUsernameExist) {

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

function registerAppPages(DBCollection) {

    app.get('/app/', authenticateToken, (req, res) => {
        res.sendFile('./app/homepage.html', { root: serveRoot })
    });

    app.get('/app/dashboard/', authenticateToken, (req, res) => {
        res.sendFile('./app/dashboard.html', { root: serveRoot })
    });

    app.get('/app/settings/', authenticateToken, (req, res) => {
        res.sendFile('./app/settings.html', { root: serveRoot })
    });

    app.get('/app/user/:username/', authenticateToken, (req, res) => {
        const username = req.params.username;

        if (!username) {
            res.redirect('/app/');
        }



    });
}

// Permission ranges from 0 to 2
// 0 is a regular user accessing another users profile
// 1 is a moderator accessing a users profile
// 2 is an admin accessing a users profile or a user accessing their own profile
function userPermissions(username, accessingUsername, collection) {
    if (username == accessingUsername) {
        return 2;
    }

    getUserFromDB(username, collection).then((result) => {
        if (result[0].user_type == 3) // 3 is admin, 2 is moderator, 1 is organization, 0 is volunteer
            return 2;
        else if (result[0].user_type == 2)
            return 1;

        return 0;
    })

    return false;
}

function userExists(username, collection) {
    return collection.find({ username: username }).toArray((err, result) => {

        if (err) {
            mongoError(err, "userExists - collection.find");
        }


        if (result.length > 0) {
            return true;
        } else {
            return false;
        }
    })

}

function addUserToDB(username, password, email, phoneNumber, userType, collection) {

    collection.insertOne({ username: username, password: password, email: email, phone_number: phoneNumber, user_type: userType }, (err, result) => {

        if (err) {
            mongoError(err, "addUserToDB - collection.insertOne");
        }

        console.log(result);

    })
}

function getUserFromDB(username, collection) {
    return collection.find({ username: username }).toArray((err, result) => {

        if (err) {
            mongoError(err, "getUserFromDB - collection.find");
        }

        if (result.length > 1) {
            mongoError(err, "getUserFromDB - collection.find returned more than one result for users");
        } else {
            return result;
        }

    })
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