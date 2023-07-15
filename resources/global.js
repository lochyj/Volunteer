//TODO: clean up this function because .innerHTML is not secure
function displayEvent(event, eventDiv) {

    event.event_description = event.event_description.replace(/\n/g, "<br>");
    var info_link = ""
    if (event.event_info != undefined) {
        info_link = `<a href="${event.event_info}" class="link">${event.event_info}</a>`
    }

    var signups = "";
    if (event.signups.length > 0) {
        if (event.signups.length > 6) {
            for (let i = 0; i < 6; i++) {
                signups += `<a href="/app/user/${event.signups[i]}">${event.signups[i]}</a><br>`
            }
        } else {
            for (let i = 0; i < event.signups.length; i++) {
                signups += `<a href="/app/user/${event.signups[i]}">${event.signups[i]}</a><br>`
            }
        }
    }

    if (event.event_commitment == "once") {
        eventDiv.innerHTML = `
            <div class="main">
                <h1 class="title">${event.event_title}</h1>
                ${info_link}
                <h3 class="inline date"> ${event.event_time[0]} - ${event.event_time[1]} every day from ${event.event_date[0]} to ${event.event_date[1]}</h3>
                <h3>What it entails</h3><br>
                <p class="description">${event.event_description}</p>
            </div>

            <div class="side">
                <h3 class="sideItem">
                    Organization<br>
                    <span class="small">
                        <a href="/app/user/${event.event_creator}">${event.event_creator}</a>
                    </span>
                </h3>
                <h3 class="sideItem">
                    Location<br>
                    <span class="small">
                        ${event.event_location}
                    </span>
                </h3>
                <h3 class="sideItem">
                    Tags<br>
                    <span class="small">
                        ${event.event_tags}
                    </span>
                </h3>
                <h3 class="commitment sideItem">
                    Commitment<br>
                    <span class="small">
                        One time
                    </span>
                </h3>
                <h3 style="margin-top: 10px;">
                    Signups<br>
                    <span class="small">
                        ${signups}
                    </span>
                </h3>
            </div>

            <button id="signup">Signup</button><br>
            <p id="error"></p>
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
                ${info_link}
                <h3 class="inline date">${event.event_commitment} for ${event.event_date[0]} to ${event.event_date[1]}</h3>
                <h3>What it entails</h3><br>
                <p class="description">${event.event_description}</p>
            </div>


            <div class="side">
                <h3 class="sideItem">
                    Organization<br>
                    <span class="small">
                        ${event.event_creator}
                    </span>
                </h3>
                <h3 class="sideItem">
                    Location<br>
                    <span class="small">
                        ${event.event_location}
                    </span>
                </h3>
                <h3 class="sideItem">
                    Tags<br>
                    <span class="small">
                        ${event.event_tags}
                    </span>
                </h3>
                <h3 class="commitment sideItem">
                    Commitment<br>
                    <span class="small">
                        One time
                    </span>
                </h3>
                <h3 style="margin-top: 10px;">
                    Signups<br>
                    <span class="small">
                        ${signups}
                    </span>
                </h3>
            </div>

            <button id="signup">Signup</button><br>
            <p id="error"></p>
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

        if (user.username != undefined) {
            toAdd += `
                <div class="section">
                    <h1>Username</h1>
                    <h2>${user.username}</h2>
                </div>
            `;

        }
        if (user.email != undefined) {
            toAdd += `
                <div class="section">
                    <h1>Email</h1>
                    <h2>${user.email}</h2>
                </div>
            `;

        }
        if (user.phone_number != undefined) {
            toAdd += `
                <div class="section">
                    <h1>Phone number</h1>
                    <h2>${user.phone_number}</h2>
                </div>
            `;

        }
         if (user_type != undefined) {
            toAdd += `
                <div class="section">
                    <h1>User type</h1>
                    <h2>${user_type}</h2>
                </div>
            `;

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
