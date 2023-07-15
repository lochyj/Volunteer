//TODO: clean up this function because .innerHTML is not secure
function displayEvent(event, eventDiv) {

    if (event.event_commitment == "once") {
        eventDiv.innerHTML = `
            <div class="main">
                <h1 class="title">${event.event_title}</h1>
                <p class="description">${event.event_description}</p>
                <h3 class="inline date">${event.event_date[0]}</h3>
                <h3 class="inline date">${event.event_date[1]}</h3>
                <h3 class="inline time">${event.event_time[0]}</h3>
                <h3 class="inline time">${event.event_time[1]}</h3>
            </div>


            <div class="side">
                <h3 class="organization">
                    Organization<br>
                    <span class="small">
                        ${event.event_creator}
                    </span>
                </h3>
                <h3 class="location">
                    Location<br>
                    <span class="small">
                        ${event.event_location}
                    </span>
                </h3>
                <h3 class="tags">
                    <span class="small">
                        ${event.event_tags}
                    </span>
                </h3>
                <h3 class="commitment">
                    Commitment<br>
                    <span class="small">
                        One time
                    </span>
                </h3>
            </div>
        `;
    } else {

        switch (event.event_commitment) {
            case "day":
                event.event_commitment = "Daily";
                break;
            case "week":
                event.event_commitment = "Weekly";
                break;
            case "fortnight":
                event.event_commitment = "Fortnightly";
                break;
            case "month":
                event.event_commitment = "Monthly";
                break;
        }

        eventDiv.innerHTML = `
            <div class="main">
                <h1 class="title">${event.event_title}</h1>
                <h3 class="inline date">${event.event_date[0]}</h3>
                <h3 class="inline date">${event.event_date[1]}</h3>
                <a href=""
                <p class="description">${event.event_description}</p>

            </div>

            <div class="side">
                <h3 class="organization">
                    Organization<br>
                    <span class="small">
                        <a href="/app/user/${event.event_creator}">${event.event_creator}</a>
                    </span>
                </h3>
                <h3 class="location">
                    Location<br>
                    <span class="small">
                        ${event.event_location}
                    </span>
                </h3>
                <h3 class="tags">
                    Type of Work<br>
                    <span class="small">
                        ${event.event_tags}
                    </span>
                </h3>
                <h3 class="commitment">
                    Commitment<br>
                    <span class="small">
                        One time
                    </span>
                </h3>
            </div>
        `;
    }



    document.title = event.event_title;
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

function truncate(str, maxlength) {
    return (str.length > maxlength) ?
      str.slice(0, maxlength - 1) + '…' :
      str;
}

function addEvent(data, feedDiv) {
    const event = document.createElement("div");
    event.classList.add("event");
    var event_info = "";
    if (data.event_info) {
        event_info = `
            <a href="${data.event_info}" class="inline"><img width="20px" hight="20px" src="/link_icon.svg">${data.event_info}</a>
        `;
    }

    event.innerHTML += `
        <a href="/app/event/${data.event_id}/">${data.event_title}</a><br>
        <p class="inline"><img width="20px" hight="20px" src="/location_icon.svg">${truncate(data.event_location, 40)}</p>
        <a href="/app/user/${data.event_creator}" class="inline"><img width="20px" hight="20px" src="/organization_icon.svg">${data.event_creator}</a>
        ${event_info}
        <p class="tab">${data.event_description}</p>

    `;
    feedDiv.appendChild(event);
}
