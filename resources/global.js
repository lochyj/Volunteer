//TODO: clean up this function because .innerHTML is not secure
function displayEvent(event, eventDiv) {
    eventDiv.innerHTML = `
        <h1>${event.event_name}</h1>
        <p>${event.event_description}</p>
        <h3>${event.event_date}</h3>
        <h3>${event.event_time}</h3>
        <h3>${event.event_location}</h3>
        <h3>${event.event_tags}</h3>
        <h3>${event.event_creator}</h3>
    `;

    document.title = event.event_name;
}

function displayUser(user, userDiv) {
        var user_type = user.user_type;
        console.log(user_type)
        switch (user.user_type) {
            case "0":
                user_type = "Volunteer";
                break;
            case "1":
                user_type = "Organization";
                break;
            case "2":
                user_type = "Moderator";
                break;
            case "3":
                user_type = "Admin";
                break;
        }

        var toAdd = "";

        var addList = [user.username, user.email, user.phone_number, user_type]

        for (var i = 0; i < addList.length; i++) {
            if (addList[i] == undefined) {
                continue;
            }
            toAdd += `<h2>${addList[i]}</h2>`;
        }

        userDiv.innerHTML = toAdd;

        document.title = user.username;
}

function addEvent(data, feedDiv) {
    const event = document.createElement("div");
    event.classList.add("event");

    // TODO: make this more secure
    event.innerHTML += `
        <h2>${data.event_name}</h2>
        <p class="tab"><img width="20px" hight="20px" src="/location_icon.svg"><img>${data.event_location}</p>
        <p class="tab"><img width="20px" hight="20px" src="/organization_icon.svg">${data.event_creator}</p>
        <h4>${data.event_date[0]} - ${data.event_date[1]}</h4>
        <h4>${data.event_time[0]} - ${data.event_time[1]}</h4>
    `;
    feedDiv.appendChild(event);
}
