// ----------------------------------------
//  DATABASE FUNCTIONS
// ----------------------------------------

async function addEventToDB(event, eventCollection) {
    eventCollection.insertOne(event);
}

async function getEventFromDB(event_id, eventCollection) {
    const event = await eventCollection.find({ event_id: event_id }).toArray();
    return event;
}

async function getEventsFromDB(number, eventCollection) {
    const events = await eventCollection.find().limit(number).toArray();
    return events;
}

async function userExists(username, userCollection) {
    const arr = await userCollection.find({ username: username }).toArray();

    if (arr.length > 0) {
        return true;
    } else if (arr.length == 0) {
        return false;
    } else {
        return null;
    }

}

async function addEventToUserDB(event_id, user, collection) {
    collection.updateOne({ username: user }, { $push: { events: event_id } });
}

async function eventExists(event_id, collection) {
    const arr = await collection.find({ event_id: event_id }).toArray();

    if (arr.length > 0) {
        return true;
    } else if (arr.length == 0) {
        return false;
    } else {
        return null;
    }

}

function addUserToDB(username, password, email, phoneNumber, userType, collection) {

    collection.insertOne({ username: username, password: password, email: email, phone_number: phoneNumber, user_type: userType, events: [] }, (err, result) => {

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

async function signupToEvent(username, event_id, collection) {
    const DBdata = await getEventFromDB(event_id, eventCollection);

    if (DBdata == null) {
        return null
    }

    var event = DBdata[0];

    if (event.signups.includes(username)) {
        return null;
    }

    event.signups.push(username);

    eventCollection.updateOne({ event_id: event_id }, { $set: { signups: event.signups } });
}

module.exports = {
    addEventToDB,
    getEventFromDB,
    userExists,
    eventExists,
    addUserToDB,
    getUserFromDB,
    getEventsFromDB,
    addEventToUserDB,
};