// ----------------------------------------
//  DATABASE FUNCTIONS
// ----------------------------------------

async function addEventToDB(
    event_name,
    event_description,
    event_date,
    event_time,
    event_location,
    event_creator,
    event_tags,
    event_uuid,
    DBCollection
) {


    const event = {
        event_id: event_uuid,
        event_name: event_name,
        event_description: event_description,
        event_date: event_date,
        event_time: event_time,
        event_location: event_location,
        event_tags: event_tags,
        event_creator: event_creator
    }


    DBCollection.insertOne(event);

}

async function getEventFromDB(event_id, DBCollection) {
    const event = await DBCollection.find({ event_id: event_id }).toArray();
    return event;
}

async function getEventsFromDB(number, eventCollection) {
    const events = await eventCollection.find().limit(number).toArray();
    return events;
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

module.exports = {
    addEventToDB,
    getEventFromDB,
    userExists,
    eventExists,
    addUserToDB,
    getUserFromDB,
    getEventsFromDB
};