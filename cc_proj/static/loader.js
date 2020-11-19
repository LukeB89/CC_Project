
function load(){
    build_index_form()
    this.current_user = undefined;
}




function post(URL,data_in, func){
    console.log("post: "+URL)
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
                    // response managed in here
                    func(data);
                });
        })
        .catch(function(err) {
        console.log('Fetch Error :-S', err);
        });
}

function build_index_form(){
    console.log("build_index_form")
    let index = document.getElementById('index');
    let user_box = document.createElement("INPUT");
    user_box.setAttribute("type", "text");
    user_box.setAttribute("id", "user_box");
    index.appendChild(user_box)

    let input_btn = document.createElement("BUTTON");
    input_btn.innerText = "Submit";
    input_btn.setAttribute("id","subBtn");
    input_btn.setAttribute("onclick","get_groups()");
    index.appendChild(input_btn)
}
function get_groups(email) {
    console.log("get_groups: "+ email)
    if(typeof(email) == 'undefined' && email == null){
        post('/get_groups',{'user':document.getElementById('user_box').value}, build_gSelect);
    }else{
        post('/get_groups',{'user':email}, build_gSelect)
    }

}

function get_events(id) {
    console.log("get_events: "+id)
    post('/get_events',{'user_group':id}, render_cal)
}

function update_new_cal(){
    console.log("update_new_cal")
    let email = document.getElementById('email').value;
    let name = document.getElementById('pg_name').value;

    let query = {'email':email,'pg_name':name};
    if (typeof(document.getElementById('pg_id')) != "undefined" && document.getElementById('pg_id') != null){
        query['pg_id'] = document.getElementById('pg_id').value;
    }
    let index = document.getElementById('index');
    index.innerHTML = "";
    post('/user_update',query, get_groups)
}



function build_gSelect(data){
    console.log("build_gSelect: ")
    console.log(data)
    let index = document.getElementById('index');
    index.innerHTML = "";
    let input_btn = document.createElement("BUTTON");
    input_btn.setAttribute("id","pg_btn");
    if(data.hasOwnProperty('personal')){
        if ('pg_id' in data['personal'] && 'pg_name' in data['personal']){
        input_btn.innerText = data['personal']['pg_name'];
        input_btn.setAttribute("onclick","get_events("+data['personal']['pg_id']+")");
        }else {
            build_new_cal_form(data);
            return;
        }
    }else {
        build_new_cal_form(data);
        return;
    }

    index.appendChild(input_btn);
    if (data['group'] != 'NA'){
        for (var key in data['group']){
            let group_btn = document.createElement("BUTTON");
            group_btn.setAttribute("id","group_btn");
            group_btn.innerText = data['group'][key]['name'];
            group_btn.setAttribute("onclick","get_events("+data['group'][key]['id']+")");
            index.appendChild(group_btn);
        }
    }

}


function render_cal(data){
    console.log("render_cal: ")
    console.log(data)
    let events = data['events']
    console.log("user: " + this.current_user)
    this.current_user = data['user_group'];
    console.log("user: " + this.current_user)
    let index = document.getElementById('index');
    index.innerHTML = "";
    let calendarEl = document.getElementById('calendar');

    let calendar = new FullCalendar.Calendar(calendarEl, {
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: false,
        selectable: true,
        businessHours: true,
        dayMaxEvents: true, // allow "more" link when too many events
        events: events,
        dateClick: function(info) {
            if (calendar.view.type == 'dayGridMonth'){
                calendar.changeView('timeGridDay', info.dateStr);
            }else if (calendar.view.type == 'timeGridWeek'){
                calendar.changeView('timeGridDay', info.dateStr);
            }else {
                event_form(1,info);
                calendar.destroy();
            }



        // alert('Resource ID: ' + info.resource.id);
        },
        eventClick: function (info) {
            event_form(2,info);
            calendar.destroy();
        }

    });

    calendar.render();
    build_share();
}

function build_share(){
    console.log("build_share")
    let index = document.getElementById('index')
    index.innerHTML = ""

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
    index.appendChild(submit_btn)

}

function update_share(){
    console.log("update_share")
    let share_email = document.getElementById('share_email').value;
    let data = {'email':share_email,'ag_ids':this.current_user};
    post('/user_update',data, get_events)

}
function pad(n){
    console.log("pad")
    return n<10 ? '0'+n : n
}

function event_form(type,data){
    console.log("event_form: ")
    console.log(data)
    console.log("user: " + this.current_user)

    let startDate;
    let startTime;
    let endDate;
    let endTime;

    if (data.hasOwnProperty('hidden')) {
        let start_time = document.getElementById('start_t');
        let end_time = document.getElementById('end_t');
        let p2 = document.getElementById('p2');
        start_time.removeAttribute('hidden');
        p2.removeAttribute('hidden');
        end_time.removeAttribute('hidden');

    } else {

        if (type == 1) {
            let date = data.date;
            startDate = [pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
            startTime = [pad(date.getHours()), pad(date.getMinutes())].join(':');
        } else if (type == 2){
            let date;
            date = data.event.start;
            startDate = [pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
            startTime = [pad(date.getHours()), pad(date.getMinutes())].join(':');
            date = data.event.end;
            endDate = [pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
            endTime = [pad(date.getHours()), pad(date.getMinutes())].join(':')
        }
        let index = document.getElementById('index');
        index.innerHTML = "";
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
        p4.innerHTML = "All Day Event: ";
        let all_day = document.createElement("INPUT");
        all_day.setAttribute("type", "checkbox");
        all_day.setAttribute("id", "all_day");
        all_day.setAttribute("onclick", "all_day_toggle()");
        p4.appendChild(all_day);
        index.appendChild(p4);

        let p5 = document.createElement("P");
        p5.setAttribute("id", "p4");
        p5.innerHTML = "Multi Day Event: ";
        let multi_day = document.createElement("INPUT");
        multi_day.setAttribute("type", "checkbox");
        multi_day.setAttribute("id", "multi_day");
        multi_day.setAttribute("onclick", "multi_day_toggle()");
        p5.appendChild(multi_day);
        index.appendChild(p5);

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
        if (type == 2){
            let del_btn = document.createElement("BUTTON");
            del_btn.innerText = "Delete Event";
            del_btn.setAttribute("id", "delBtn");
            del_btn.setAttribute("onclick", "delete_event()");
            index.appendChild(del_btn)
        }



        start_time.setAttribute('value', startTime);
        start_date.setAttribute('value', startDate);
        if (type === 1 && data.allDay === true) {
            all_day.setAttribute('checked', "");
            all_day_toggle();
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
            if (data.event.allDay === true){
                let start = data.event.start;
                let end = data.event.end;
                if (is_multiDay(start,end) === false){
                    all_day.setAttribute('checked', "");
                    all_day_toggle();
                }else{
                    multi_day.setAttribute('checked', "");
                    multi_day_toggle();
                }
            }
        }
    }

}

function is_multiDay(start, end){
    let diff = (end.getTime() - start.getTime())/ (1000 * 3600 * 24);
    if (diff <= 1){
        return false;
    }else{
        return true;
    }
}

function all_day_toggle(){
    console.log("allday")
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
    console.log("multiday")
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
    let data = {'drop':true};
    data["event_id"] = document.getElementById('event_id').value;
    post('/events_update',data, event_msg)
}
function update_event(type){
    console.log("update_event")
    let data = {'user_group':this.current_user}
    let start_date = document.getElementById('start_d').value;
    let start_time = document.getElementById('start_t').value;
    let end_date = document.getElementById('end_d').value;
    let end_time = document.getElementById('end_t').value;
    let event_name = document.getElementById('event_name').value;
    let all_day = document.getElementById('all_day');
    let multi_day = document.getElementById('multi_day');
    data["event_name"] = event_name;
    if(type === 2){
        data["event_id"] = document.getElementById('event_id').value;
    }
    if (data["event_name"] === "" || data['event_start_dt'] === "T" || data['event_end_dt'] === "T"){
        alert("All Show Fields Must Not Be Empty");
        return;
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
    if (data["event_name"] === "" || data['event_start_dt'] === "T" || data['event_end_dt'] === "T"){
        alert("All Show Fields Must Not Be Empty");
        return;
    }else{
        post('/events_update',data, event_msg)
    }

}

function back_to_cal(){
    get_events(this.current_user);
}

function event_msg(data){
    console.log("event msg: ")
    console.log(data)
    if (data['success']){
        back_to_cal(this.current_user);
    }else {
        alert(data['msg']);
    }
}

function build_new_cal_form(data){
    console.log("build_new_cal_form: "+data)
    let index = document.getElementById('index');
    index.innerHTML = "";
    console.log("new cal")
    console.log(data)

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
    in_box2.setAttribute('placeholder', "Enter Name of Calendar Group");
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