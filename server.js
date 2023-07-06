require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const mongo = require('mongodb').MongoClient
const bcrypt = require('bcrypt')
var cookieParser = require('cookie-parser')
const url = 'mongodb://127.0.0.1:27017'
const dbName = 'Volunteer'
app.use(express.json())
app.use(cookieParser())


// PUBLIC PAGES
app.get('/', (req, res) => {
    res.sendFile('./pages/index.html', { root: __dirname })
})
app.get('/register', (req, res) => {
    res.sendFile('./pages/register.html', { root: __dirname })
})
app.get('/login', (req, res) => {
    res.sendFile('./pages/login.html', { root: __dirname })
})

// SECURE PAGE
app.get('/app', authenticateToken, (req, res) => { /* Add authenticateToken to make the route secure */
    res.sendFile('./pages/app.html', { root: __dirname })
})

// app.get('/api/users/data', authenticateToken, async (req, res) => {
//     const user = getUser(req.cookies.accessToken);
//     if (user == null) {
//         res.sendStatus(403)
//     } else {
//         var Data = await getUserData(user);
//         console.log("Get");
//         console.log(Data);
//         if (Data == undefined) {
//             res.sendStatus(404)
//         } else {
//             res.send({Data});
//         }
//     }
// })

// app.post('/api/post/create', authenticateToken, (req, res) => {
//     const user = getUser(req.cookies.accessToken);
//     try {
//         createPost(user, req.body)
//         res.sendStatus(200)
//     } catch (err) {
//         res.sendStatus(400)
//     }
// })

// TODO: remove this in place of DB based authentication
let refreshTokens = [];

app.post('/auth/register', async(req, res) => {

    if (!req.body.username || !req.body.password) {
        res.status(400).json({
            message: "Please provide a username and / or password"
        })

        return;
    }

    const { username, password } = req.body;

    const isUsernameTaken = userExists(username);

    if (isUsernameTaken) {
        res.status(400).json({ error: 'Username already exists' })
        return;
    }

    if (!isUsernameTaken) {
        const hash = await bcrypt.hash(password, 10)

        addUserToDB(username, hash)

        res.status(200).json({ message: 'User created' })
    }
})

app.post('/auth/token', (req, res) => {

    // Getting the refresh token from the requests http only cookies
    const refreshToken = req.body.token

    // If there is no refresh token in the request return an error && If the refresh token does not exist in our array of refresh tokens return an error
    if (refreshToken == null) return res.sendStatus(401)
    if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)

    // Verify the refresh token, if it is valid, respond with an access token, otherwise return an error
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        // If there was a server side error return an error
        if (err) return res.sendStatus(403)

        // If the refresh token is valid create a new access token, and send it to the user
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

    const doesUsernameExist = userExists(username);

    if (doesUsernameExist) {

        const userCredentials = getUserFromDB(username)
        const storedHashedPassword = userCredentials.password

        const passwordIsValid = await bcrypt.compare(password, storedHashedPassword)

        if (passwordIsValid) {
            const accessToken = generateAccessToken({ name: username })
            const refreshToken = jwt.sign({ name: username }, process.env.REFRESH_TOKEN_SECRET)

            refreshTokens.push(refreshToken)

            res.cookie('accessToken', accessToken, { httpOnly: true })
            res.cookie('refreshToken', refreshToken, { httpOnly: true })

            res.send().status(200)
        } else {
            res.status(400).json({ error: 'Invalid credentials' })
        }
    } else {
        res.status(400).json({ error: 'User does not exist' })
    }
})

// FUNCTION DEFINITIONS:

async function openDBConnection() {
    var collection = null;
    mongo.connect(url, (err, client) => {
        if (err) {
            mongoError(err, "openDBConnection - connect");
        }
        var db = client.db(dbName);
        collection = db.collection("Users");
    }).then(() => {
        if (collection == null) {
            mongoError("collection is null", "openDBConnection - collection");
        }

        return collection;
    });
}

function mongoError(error, message = "Message not given...") {
    console.log("-------------------------------------------------");
    console.log("WOAH! There was a mongoDB error, what a surprise!");
    console.log(`Message: ${message}`);
    console.log("Error:");
    console.log(error);
    console.log("-------------------------------------------------");
}

function userExists(username) {

    collection.find({ username: username }).toArray((err, result) => {

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

function getUserFromDB(username) {
    collection.find({ username: username }).toArray((err, result) => {

        if (err) {
            mongoError(err, "getUserFromDB - collection.find");
        }

        if (result.length > 1) {
            mongoError(err, "getUserFromDB - collection.find returned more than one result for users");
        } else {
            return result[0];
        }

    })
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TIME })
}

function authenticateToken(req, res, next) {
    const token = req.cookies.accessToken;

    // If there is no token in the request return an error and redirect to login
    if (token == null) return res.sendStatus(401).redirect('/login');

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user;
        next()
    })
}

function getUser(token) {
    let User;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return null;
        User = user;
    })
    return User.name;
}

//TODO: ERROR HERE
function addUserToDB(username, password) {

    console.log(1)

    collection.insertOne({ username: username, password: password }, (err, result) => {
        console.log(2)

        if (err) {
            mongoError(err, "addUserToDB - collection.insertOne");
        }

        console.log(result);

    })
}

// function createPost(username, data) {
//     mongo.connect(url, (err, client) => {
//         if (err) {
//             console.log(err);
//         }
//         const db = client.db(dbName)
//         const collection = db.collection('data')
//         // check if the user already has posts and append on to the end
//         collection.find({ username: username }).toArray((err, result) => {
//             if (err) {
//                 console.log(err)
//             }
//             if (result.length == 0) {
//                 collection.insertOne({ username: username, posts: [{ title: data.title, content: data.content }] }, (err, result) => {
//                     if (err) {
//                         console.log(err)
//                     }
//                     client.close()
//                 })
        
//             } else {
//                 collection.updateOne({ username: username }, { $push: { posts: { title: 'test', content: 'test' } } }, (err, result) => {
//                     if (err) {
//                         console.log(err)
//                     }
//                     client.close()
//                 })
//             }
//         })
//     })
// }

// async function getUserData(user) {
//     let Result;
//     mongo.connect(url, (err, client) => {
//         if (err) {
//             console.log(err)
//         }
//         const db = client.db(dbName)
//         const collection = db.collection('data')
//         collection.find({ username: user }).toArray((err, result) => {
//             if (err) {
//                 console.log(err)
//             }
//             Result = JSON.stringify(result);
//             client.close()
//             console.log("Get usr data")
//             console.log(Result)
//             return Result;
//         })
//     })

// };


// --------------------------------------

// connect to the database

var collection = openDBConnection();

console.log("Server started on port 80");
console.log("http://localhost:80");
app.listen(80);