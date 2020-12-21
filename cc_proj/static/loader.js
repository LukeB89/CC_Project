
function load(){
    // Builds the single page application and sets up global variables
    build_index_form();
    this.current_user = undefined;
    this.current_filter = '0';
}


function post(URL, data_in, func){
    // Universal Post function to handel backend calls
    // URL - The backend path to post to
    // data_in - The Data to be passed to the backend
    // func - The function to run when the response is returned from the back end
    fetch(URL,{
        method: 'POST',
        credentials: 'same-origin',
        headers:{
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest', //Necessary to work with request.is_ajax()
              'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(data_in) //JavaScript object of data to POST
    })
        .then(function(response) {
            if (response.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' + response.status);
                return;
            }

            // Examine the text in the response
            response.json()
                .then(function(data) {
                    // passes response data to function supplied in post call
                    func(data);
                });
        })
        .catch(function(err) {
        console.log('Fetch Error :-S', err);
        });
}

function reset_page(id) {
    // Universal call to tidy up page before creating new parts
    // id - passed from pages that require calendar to be removed without
    // being able to access calendar to run .destroy()
    let index = document.getElementById('index');
    index.innerHTML = "";
    let filter = document.getElementById('filter');
    filter.innerHTML = "";
    if(id == 1){
        let calendar = document.getElementById("calendar");
        calendar.innerHTML = "";
    }

}

function build_index_form(id){
    // builds the form to get the calendars.
    // id - passed from pages that require calendar to be removed without
    // being able to access calendar to run .destroy()
    // User enters emal to get list of associated Calendars
    if(id == 1){
        reset_page(1);
    }else{
        reset_page();
    }

    // Build each element and add to index
    let index = document.getElementById('index');

    let p1 = document.createElement("P");
    p1.innerText = "Please Enter Your Email"
    index.appendChild(p1)

    let p2 = document.createElement("P");
    let user_box = document.createElement("INPUT");
    user_box.setAttribute("type", "text");
    user_box.setAttribute('placeholder', 'test@test.com');
    user_box.setAttribute("id", "user_box");
    p2.appendChild(user_box)
    index.appendChild(p2)

    let p3 = document.createElement("P");
    let input_btn = document.createElement("BUTTON");
    input_btn.innerText = "Submit";
    input_btn.setAttribute("id","subBtn");
    input_btn.setAttribute("onclick","get_groups()");
    p3.appendChild(input_btn)
    index.appendChild(p3)
}

function get_groups(email) {
    // function to get the groups associated with an email address
    // email - if supplied use this if not get email from text box.

    if(typeof(email) == 'undefined' && email == null){
        post('/get_groups',{'user':document.getElementById('user_box').value}, build_gSelect);
    }else{
        post('/get_groups',{'user':email}, build_gSelect);
    }

}

function get_events(id, filter=false) {
    // Function to get events based on parameters entered
    // id - this is the user_group id (which users calendar you want to see the calendar for)
    // filter - This is defaulted to false but if set will add the filter to display only certain events
    if (filter){
        let filterEL = document.getElementById('filter_select');
        post('/get_events',{'user_group':id,'filter':filterEL.value}, render_cal);
    }else{
        post('/get_events',{'user_group':id}, render_cal);
    }

}

function update_new_cal(){
    // Function to gather name and email of a new calendar in the system
    let email = document.getElementById('email').value;
    let name = document.getElementById('pg_name').value;

    let query = {'email':email,'pg_name':name};
    if (typeof(document.getElementById('pg_id')) != "undefined" && document.getElementById('pg_id') != null){
        query['pg_id'] = document.getElementById('pg_id').value;
    }
    // if empty fields exist you cannot submit
    if(email == "" || name == ""){
        alert("All Fields Must Be Filled");
    }else{
        post('/user_update',query, get_groups);
    }
}



function build_gSelect(data){
    // Function to build the selection page for user to choose what calendar to view
    // data - passed data from backend to create buttons
    reset_page();
    // create each required element
    let index = document.getElementById('index');
    let p1 = document.createElement("P");
    p1.innerText = "Personal Calendar";
    index.appendChild(p1);
    let p2 = document.createElement("P");
    let input_btn = document.createElement("BUTTON");
    input_btn.setAttribute("id","pg_btn");
    // if personal is empty change to build_new_cal_form
    if(data.hasOwnProperty('personal')){
        // if keys are missing change to build_new_cal_form
        if ('pg_id' in data['personal'] && 'pg_name' in data['personal']){
        input_btn.innerText = data['personal']['pg_name'];
        input_btn.setAttribute("onclick","get_events("+data['personal']['pg_id']+")");
        }else {
            build_new_cal_form(data);
            return; // ensures rest of current for is not created
        }
    }else {
        build_new_cal_form(data);
        return;// ensures rest of current for is not created
    }
    p2.append(input_btn);
    index.appendChild(p2);
    let p3 = document.createElement("P");
    // if there are associated calendars other than personal build them
    // if not generic message
    if (data['group'] != 'NA'){
        p3.innerText = "Calenders Shared With You";
        index.appendChild(p3);
        let p4 = document.createElement("P");
        for (var key in data['group']){
            let group_btn = document.createElement("BUTTON");
            group_btn.setAttribute("id","group_btn");
            group_btn.innerText = data['group'][key]['name'];
            group_btn.setAttribute("onclick","get_events("+data['group'][key]['id']+")");
            p4.appendChild(group_btn);
        }
        index.appendChild(p4);
    }else {
        p3.innerText = "You Have No Calenders Shared With You";
        index.appendChild(p3);
    }

}


function render_cal(data){
    // this is the main function f the age and used to render the calendar and side panels
    // data - passed from the back end and is used to populate the calendar.
    let events = data['events']
    this.current_user = data['user_group'];
    reset_page();
    let calendarEl = document.getElementById('calendar');

    let calendar = new FullCalendar.Calendar(calendarEl, {
        headerToolbar: { // sets up the control panel of the calendar
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: false,
        selectable: true,
        businessHours: true,
        dayMaxEvents: true, // allow "more" link when too many events
        events: events, // events added here
        // control to change to day format if month or week is current view,
        // else selected hour/allday info is passed to event_form and the calendar is destroyed
        dateClick: function(info) {
            if (calendar.view.type == 'dayGridMonth'){
                calendar.changeView('timeGridDay', info.dateStr);
            }else if (calendar.view.type == 'timeGridWeek'){
                calendar.changeView('timeGridDay', info.dateStr);
            }else {
                event_form(1,info); // create event
                calendar.destroy();
            }

        },
        // controll to edit an event that is already on the calendar
        eventClick: function (info) {
            event_form(2,info);// view and edit event
            calendar.destroy();
        }

    });

    // render the calendar to its div
    calendar.render();
    // if filter is applied then build panels with that filter if not generic build
    if(data.hasOwnProperty('filter')){
        build_pannels(data['filter']);
    }else{
        build_pannels();
    }

}

function build_pannels(id){
    // function to build the side panels.
    // id - filter id that should be shown in the drop box

    reset_page();
    // index is the left panel, contains text box for sharing to email,
    // submit button to work with that email and logout button to bo back to
    // index page
    let index = document.getElementById('index');
    // contains filter dropdown menu. alters events in calendar on change.
    let filter = document.getElementById('filter');

    let p1 = document.createElement("P");
    p1.innerHTML = "Share To: "

    let share_email = document.createElement("INPUT")
    share_email.setAttribute('placeholder', "Enter Email Address");
    share_email.setAttribute("type", "text");
    share_email.setAttribute("id", "share_email");

    p1.appendChild(share_email);
    index.appendChild(p1)

    let submit_btn = document.createElement("BUTTON");
    submit_btn.innerText = "Submit";
    submit_btn.setAttribute("id", "subBtn");
    submit_btn.setAttribute("onclick", "update_share()");
    index.appendChild(submit_btn);

    let logout_btn = document.createElement("BUTTON");
    logout_btn.innerText = "Logout";
    logout_btn.setAttribute("id", "lgtBtn");
    logout_btn.setAttribute("onclick", "build_index_form(1)");
    index.appendChild(logout_btn);

    let p2 = document.createElement("P");
    p2.innerHTML = "Filter Events By: ";

    let fSelect = document.createElement("SELECT");
    fSelect.setAttribute('id', 'filter_select');
    fSelect.setAttribute("onchange", "get_events("+this.current_user+","+true+")")

    let option0 = document.createElement("OPTION");
    option0.innerText = "All";
    option0.setAttribute('value','0');
    fSelect.appendChild(option0);

    let option1 = document.createElement("OPTION");
    option1.innerText = "Work";
    option1.setAttribute('value','1');
    fSelect.appendChild(option1);

    let option2 = document.createElement("OPTION");
    option2.innerText = "College";
    option2.setAttribute('value','2');
    fSelect.appendChild(option2);

    let option3 = document.createElement("OPTION");
    option3.innerText = "Personal";
    option3.setAttribute('value','3');
    fSelect.appendChild(option3);

    let option4 = document.createElement("OPTION");
    option4.innerText = "None";
    option4.setAttribute('value','4');
    fSelect.appendChild(option4);

    // if id is present change current filter value to id
    if(typeof(id) != 'undefined' && id != null){
        this.current_filter = id;
    }

    fSelect.value = this.current_filter;
    p2.appendChild(fSelect);
    filter.appendChild(p2);


}

function update_share(){
    // function to share current calendar with user email
    let share_email = document.getElementById('share_email').value;
    let data = {'email':share_email,'ag_ids':this.current_user};
    post('/user_update',data, get_events);

}
function pad(n){
    // function to pad 0 values in time stamps
    return n<10 ? '0'+n : n
}

function event_form(type,data){
    // function to create event form based on arguments
    // type - type of event form to create. 1 = new event. 2 = update event
    // data - the data used in creating/updating the event (auto fill)

    let startDate;
    let startTime;
    let endDate;
    let endTime;

    // toggles certain features that are hidden to user based on certain selections
    if (data.hasOwnProperty('hidden')) {
        let start_time = document.getElementById('start_t');
        let end_time = document.getElementById('end_t');
        let p2 = document.getElementById('p2');
        start_time.removeAttribute('hidden');
        p2.removeAttribute('hidden');
        end_time.removeAttribute('hidden');

    } else {
        // if new event get start date and time
        if (type == 1) {
            let date = data.date;
            startDate = [pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
            startTime = [pad(date.getHours()), pad(date.getMinutes())].join(':');
        // else get different start date and time and if present get end version aswell
        } else if (type == 2){
            let date;
            date = data.event.start;
            startDate = [pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
            startTime = [pad(date.getHours()), pad(date.getMinutes())].join(':');
            if(data.event.end != null){
                date = data.event.end;
                endDate = [pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
                endTime = [pad(date.getHours()), pad(date.getMinutes())].join(':')
            }
        }
        // clean up old page
        reset_page();
        // build new page
        let index = document.getElementById('index');
        let p1 = document.createElement("P");
        p1.setAttribute("id", "p1");
        p1.innerHTML = "Event Start: ";
        let start_date = document.createElement("INPUT");
        start_date.setAttribute("type", "date");
        start_date.setAttribute("id", "start_d");
        p1.appendChild(start_date);

        let start_time = document.createElement("INPUT");
        start_time.setAttribute("type", "time");
        start_time.setAttribute("id", "start_t");
        p1.appendChild(start_time);
        index.appendChild(p1);

        let p2 = document.createElement("P");
        p2.setAttribute("id", "p2");
        p2.innerHTML = "Event End: ";
        let end_date = document.createElement("INPUT");
        end_date.setAttribute("type", "date");
        end_date.setAttribute("id", "end_d");
        p2.appendChild(end_date);

        let end_time = document.createElement("INPUT");
        end_time.setAttribute("type", "time");
        end_time.setAttribute("id", "end_t");
        p2.appendChild(end_time);
        index.appendChild(p2);

        let p3 = document.createElement("P");
        p3.setAttribute("id", "p3");
        p3.innerHTML = "Event Name: ";
        let name = document.createElement("INPUT");
        name.setAttribute("type", "text");
        name.setAttribute("id", "event_name");
        p3.appendChild(name);
        index.appendChild(p3);

        let p4 = document.createElement("P");
        p4.setAttribute("id", "p4");
        p4.innerHTML = "Event Tag: ";

        let fSelect = document.createElement("SELECT");
        fSelect.setAttribute('id', 'filter_select');
        let option1 = document.createElement("OPTION");
        option1.innerText = "Work";
        option1.setAttribute('value','1');
        fSelect.appendChild(option1);
        let option2 = document.createElement("OPTION");
        option2.innerText = "College";
        option2.setAttribute('value','2');
        fSelect.appendChild(option2);
        let option3 = document.createElement("OPTION");
        option3.innerText = "Personal";
        option3.setAttribute('value','3');
        fSelect.appendChild(option3);
        // if the current filter is not 'all' or 'none' then change
        // drop down value to current filter value
        if(this.current_filter != '0' && this.current_filter != '4'){
            fSelect.value = this.current_filter;
        }
        p4.appendChild(fSelect);
        index.appendChild(p4);

        let p5 = document.createElement("P");
        p5.setAttribute("id", "p5");
        p5.innerHTML = "Event Description: ";
        let description = document.createElement("TEXTAREA")
        description.setAttribute('id', 'event_description')
        description.setAttribute('placeholder', "Add a description for this event...");
        description.setAttribute('cols',40);
        description.setAttribute('rows', 5);
        p5.appendChild(description);
        index.appendChild(p5);

        let p6 = document.createElement("P");
        p6.setAttribute("id", "p6");
        p6.innerHTML = "All Day Event: ";
        let all_day = document.createElement("INPUT");
        all_day.setAttribute("type", "checkbox");
        all_day.setAttribute("id", "all_day");
        all_day.setAttribute("onclick", "all_day_toggle()");
        p6.appendChild(all_day);
        index.appendChild(p6);

        let p7 = document.createElement("P");
        p7.setAttribute("id", "p4");
        p7.innerHTML = "Multi Day Event: ";
        let multi_day = document.createElement("INPUT");
        multi_day.setAttribute("type", "checkbox");
        multi_day.setAttribute("id", "multi_day");
        multi_day.setAttribute("onclick", "multi_day_toggle()");
        p7.appendChild(multi_day);
        index.appendChild(p7);

        let submit_btn = document.createElement("BUTTON");
        submit_btn.innerText = "Submit";
        submit_btn.setAttribute("id", "subBtn");
        submit_btn.setAttribute("onclick", "update_event("+type+")");
        index.appendChild(submit_btn)

        let bk_btn = document.createElement("BUTTON");
        bk_btn.innerText = "Back";
        bk_btn.setAttribute("id", "bkBtn");
        bk_btn.setAttribute("onclick", "back_to_cal()");
        index.appendChild(bk_btn)
        // if type = update add delete button
        if (type == 2){
            let del_btn = document.createElement("BUTTON");
            del_btn.innerText = "Delete Event";
            del_btn.setAttribute("id", "delBtn");
            del_btn.setAttribute("onclick", "delete_event()");
            index.appendChild(del_btn)
        }



        start_time.setAttribute('value', startTime);
        start_date.setAttribute('value', startDate);
        // if new event and allday was pressed, select all day and toggle
        if (type === 1 && data.allDay === true) {
            all_day.setAttribute('checked', "");
            all_day_toggle();
        // else if update event fill in values with previously known values
        }else if(type === 2){
            let event_id = document.createElement("INPUT");
            event_id.setAttribute("type", "text");
            event_id.setAttribute("id", "event_id");
            event_id.setAttribute("value", data.event.id);
            event_id.setAttribute('hidden',"");
            index.appendChild(event_id);

            end_time.setAttribute('value', endTime);
            end_date.setAttribute('value', endDate);
            name.setAttribute('value',data.event.title);
            fSelect.value =  data.event.groupId.toString();
            description.value =  data.event.extendedProps.description;
            // if allday is selected
            if (data.event.allDay === true){
                // get start and end data
                let start = data.event.start;
                let end = data.event.end;
                // if no end data or is_multiday check is false. set all day data
                if (end == null || is_multiDay(start,end) === false){
                    all_day.setAttribute('checked', "");
                    all_day_toggle();
                // else set multi day data
                }else{
                    multi_day.setAttribute('checked', "");
                    multi_day_toggle();
                }
            }
        }
    }

}

function is_multiDay(start, end){
    // function to see is supplied dates span more than 24 hours
    let diff = (end.getTime() - start.getTime())/ (1000 * 3600 * 24);
    if (diff <= 1){
        return false;
    }else{
        return true;
    }
}

function all_day_toggle(){
    // function to toggle all day features (user friendly feature)
    let multi_day = document.getElementById("multi_day");
    multi_day.checked = false;
    let all_day = document.getElementById("all_day");
    let start_time = document.getElementById('start_t');
    let p2 = document.getElementById('p2');
    if (all_day.checked !== true){
        event_form(1,{'hidden':true})
    }else{
        start_time.setAttribute('hidden', "");
        p2.setAttribute('hidden', "");
    }
}

function multi_day_toggle(){
    // function to toggle multi day features (user friendly feature)
    let all_day = document.getElementById("all_day");
    all_day.checked = false;
    let multi_day = document.getElementById("multi_day");
    let start_time = document.getElementById('start_t');
    let end_time = document.getElementById('end_t');
    let p2 = document.getElementById('p2');
    if (multi_day.checked !== true){
        event_form(1,{'hidden':true})
    }else{
        if (p2.hasAttribute('hidden')){
            p2.removeAttribute('hidden');
        }
        start_time.setAttribute('hidden', "");
        end_time.setAttribute('hidden', "");

    }
}
function delete_event(){
    // function to remove an event that is not required
    let data = {'drop':true};
    data["event_id"] = document.getElementById('event_id').value;
    post('/events_update',data, event_msg);
}
function update_event(type){
    // function to update an event
    // type - the type of update. 1 = new event. 2 = update event
    // gathers event details
    let data = {'user_group':this.current_user};
    let start_date = document.getElementById('start_d').value;
    let start_time = document.getElementById('start_t').value;
    let end_date = document.getElementById('end_d').value;
    let end_time = document.getElementById('end_t').value;
    let event_name = document.getElementById('event_name').value;
    let event_group = document.getElementById('filter_select').value;
    let description = document.getElementById('event_description').value;
    let all_day = document.getElementById('all_day');
    let multi_day = document.getElementById('multi_day');
    data["event_name"] = event_name;
    data["event_group"] = event_group;
    data["description"] = description;
    // if this is an update include the event_id
    if(type === 2){
        data["event_id"] = document.getElementById('event_id').value;
    }

    if (all_day.checked === false && is_multiDay(new Date(start_date+" "+start_time), new Date(end_date+" "+end_time))){
        multi_day.checked = true;
        multi_day_toggle();
    }
    if (all_day.checked){
        data['event_start_dt'] = start_date;
    }else if (multi_day.checked){
        data['event_start_dt'] = start_date;
        data['event_end_dt'] = end_date;
    }else{
        data['event_start_dt'] = start_date + "T" + start_time;
        data['event_end_dt'] = end_date + "T" + end_time;
    }
    // if any fields are empty do not post
    if (data["event_name"] === "" || data['event_start_dt'] === "T" || data['event_end_dt'] === "T" || data["description"] == ""){
        alert("All Fields Except Toggle Boxes Must Not Be Empty");
        return;
    }else{
        post('/events_update',data, event_msg);
    }

}

function back_to_cal(){
    // function to re render the calendar
    get_events(this.current_user, 0);
}

function event_msg(data){
    // used as an intermediary in the event an update or deletion did not work
    if (data['success']){
        back_to_cal(this.current_user);
    }else {
        alert(data['msg']);
    }
}

function build_new_cal_form(data){
    // function to build a new calendar
    // data -  used in auto filling what can be filled in the form
    reset_page();
    let index = document.getElementById('index');

    let p1 = document.createElement("P");
    p1.innerHTML = "Email: ";
    let in_box1 = document.createElement("INPUT");
    in_box1.setAttribute('value', data['email']);
    in_box1.setAttribute('readonly', "");
    in_box1.setAttribute("type", "text");
    in_box1.setAttribute("id", "email");

    p1.appendChild(in_box1);
    index.appendChild(p1);

    let p2 = document.createElement("P");
    p2.innerHTML = "Calendar Name: ";
    let in_box2 = document.createElement("INPUT");
    in_box2.setAttribute('placeholder', "Enter Name of Calendar");
    in_box2.setAttribute("type", "text");
    in_box2.setAttribute("id", "pg_name");

    p2.appendChild(in_box2);
    index.appendChild(p2);

    let input_btn = document.createElement("BUTTON");
    input_btn.innerText = "Submit";
    input_btn.setAttribute("id","subBtn");
    input_btn.setAttribute("onclick","update_new_cal()");
    index.appendChild(input_btn)

    if(data.hasOwnProperty('personal')){
        let in_box3 = document.createElement("INPUT");
        in_box3.setAttribute('value', data['personal']['pg_id']);
        in_box3.setAttribute('readonly', "");
        in_box3.setAttribute("type", "text");
        in_box3.setAttribute('hidden', "");
        in_box3.setAttribute("id", "pg_id");
        index.appendChild(in_box3);
    }


}