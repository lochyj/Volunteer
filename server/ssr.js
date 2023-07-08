
async function SSRUserPage(username, accessor, DBCollection) {

    if (userExists(username, DBCollection) == false)
        return null;

    const permissionLevel = await userPermissions(username, accessor, DBCollection);

    const DBdata = await getUserFromDB(username, DBCollection);

    if (DBdata == null) {
        console.log("Something went wrong with getting userdata from the db")
        const file = SSRErrorPage("500")
        return file;
    }

    const cleanDBData = filterUserdata(DBdata[0], permissionLevel);

    if (cleanDBData == null) {
        console.log("Something went from with cleaning the userdata")
        const file = SSRErrorPage("500")
        return file;
    }

    const userFile = fs.readFileSync('./app/user.html', 'utf8');

    const file = userFile.replace(`"//..%&&%..//"`, JSON.stringify(cleanDBData));

    return file;

}

async function SSREventsPage(event, eventsCollection) {

    if (eventExists(event, eventsCollection) == false) {
        const file = SSRErrorPage("Event doesn't exist")
        return file;
    }

    const eventData = await getEventFromDB(username, DBCollection);


    if (eventData == null) {
        console.log("Something went wrong with getting userdata from the db")
        const file = SSRErrorPage("500")
        return file;
    }

    const eventFile = fs.readFileSync('./app/event.html', 'utf8');

    const file = eventFile.replace(`"//..%&&%..//"`, JSON.stringify(eventData));

    return file;

}

async function SSRErrorPage(error) {

    const errorFile = fs.readFileSync('./app/error.html', 'utf8');

    const file = errorFile.replace(`"//..%&&%..//"`, JSON.stringify(error));

    return file;

}

module.exports = {
    SSRUserPage,
    SSREventsPage,
    SSRErrorPage
}