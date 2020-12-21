from django.shortcuts import render
from django.http import JsonResponse
from configparser import ConfigParser
import datetime as dt
import mysql.connector
import json
import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

config = ConfigParser()
config.read(BASE_DIR + "/config.ini")
options = config["DB"]
host = options["host"]
user = options["user"]
password = options["password"]
database = options["database"]
port = options["port"]

def index(request):
    # used to render the index page
    with open('log.txt', 'w') as f:
        f.write("load\n")

    return render(request, 'index.html')


def get_groups(request):
    #  function to obtain the list of groups both personal and associated and pass them back to be rendered
    in_email = json.load(request)
    query = ("SELECT * FROM user_groups WHERE email='{}'".format(in_email['user']))
    cnx = mysql.connector.connect(user=user, password=password, host=host, database=database, port=port)
    cursor = cnx.cursor()
    cursor.execute(query)
    builder = {}
    r_val = cursor.fetchall()
    if not r_val:
        builder['email'] = in_email['user']
    else:
        for (email,pg_id,ag_ids,pg_name) in r_val:
            builder['email'] = email
            builder['personal'] = {'pg_id':pg_id}
            if pg_name != 'NA':
                builder['personal']['pg_name'] = pg_name
            builder['group'] = {}
            if ag_ids != 'NA':
                query = ("SELECT pg_id,pg_name FROM user_groups WHERE pg_id in ({})".format(ag_ids))
                cursor.execute(query)
                for i, (pg_id, pg_name) in enumerate(cursor):
                    builder['group']["group_{}".format(i)] = {}
                    builder['group']["group_{}".format(i)]['id'] = pg_id
                    builder['group']["group_{}".format(i)]['name'] = pg_name
            else:
                builder['group'] = 'NA'
    cnx.commit()
    cursor.close()
    cnx.close()
    return JsonResponse(builder, safe=False)


def get_events(request):
    # function to obtain the list of event and pass them back to be rendered
    in_data = json.load(request)
    events = []
    cnx = mysql.connector.connect(user=user, password=password, host=host, database=database, port=port)
    cursor = cnx.cursor()
    if 'filter' in in_data and in_data['filter'] is not '0':
        query = ("SELECT * FROM events WHERE user_group = {} AND event_group = {}".format(in_data['user_group'], in_data['filter']))
    else:
        query = ("SELECT * FROM events WHERE user_group = {}".format(in_data['user_group']))

    cursor.execute(query)

    for (user_group, event_name, event_start_dt, event_end_dt, event_id, event_group, description) in cursor:
        event = {'title': event_name, 'id': event_id, 'groupId': event_group, 'description': description}
        start = str(event_start_dt).split(" ")
        if event_end_dt is not None:
            end = str(event_end_dt).split(" ")
        else:
            end = None

        if start[1] == '00:00:00' and end is None:
            event['start'] = start[0]
        elif start[1] == '00:00:00' and end[1] == '00:00:00':
            event['start'] = start[0]
            event['end'] = end[0]
        else:
            event['start'] = start[0] + "T" + start[1]
            if end is not None:
                event['end'] = end[0] + "T" + end[1]
        events.append(event)
    data = {'user_group':in_data['user_group'],'events':events}
    if 'filter' in in_data:
        data['filter'] = in_data['filter']
    return JsonResponse(data, safe=False)

def update_user(request):
    # function to update a user. This is for insert and update
    in_data = json.load(request)
    cnx = mysql.connector.connect(user=user, password=password, host=host, database=database, port=port)
    cursor = cnx.cursor()
    if 'pg_id' not in in_data:
        if 'ag_ids' in in_data:
            query = ("SELECT pg_id, ag_ids FROM user_groups WHERE email = '{}'".format(in_data['email']))
            cursor.execute(query)
            rows = cursor.fetchall()
            if len(rows) > 0:
                if rows[0][1] == 'NA':
                    query = ("UPDATE user_groups SET ag_ids = '{}' WHERE email = '{}';".format(in_data['ag_ids'], in_data['email']))
                elif str(in_data['ag_ids']) in rows[0][1]:
                    query = 'NA'
                else:
                    query = ("UPDATE user_groups SET ag_ids = CONCAT(ag_ids , ',{}') WHERE email = '{}';".format(in_data['ag_ids'], in_data['email']))
            else:
                query = ("INSERT INTO user_groups (email, ag_ids) VALUES ('{}', '{}');".format(in_data['email'],in_data['ag_ids']))
            data = in_data['ag_ids']
        else:
            query = ("INSERT INTO user_groups (email, pg_name) VALUES ('{}', '{}');".format(in_data['email'],in_data['pg_name']))
            data = in_data['email']
    else:
        query = ("UPDATE user_groups SET pg_name = '{}' WHERE email = '{}';".format(in_data['pg_name'],in_data['email']))
        data = in_data['email']
    try:
        if query == 'NA':
            pass
        else:
            cursor.execute(query)
            cnx.commit()
    except mysql.connector.Error as err:
        with open('log.txt', 'w') as f:
            f.write("err: {}\n".format(err))
        print("err: {}".format(err))

    cursor.close()
    cnx.close()
    return JsonResponse(data, safe=False)


def check_events(data):
    # this function is used to check if event is in the systems to prevent updating non-events
    cnx = mysql.connector.connect(user=user, password=password, host=host, database=database, port=port)
    cursor = cnx.cursor()

    if 'event_end_dt' in data:
        start = dt.datetime.strptime(data['event_start_dt'][:10],'%Y-%m-%d')
        end = dt.datetime.strptime(data['event_end_dt'][:10], '%Y-%m-%d')
        end += dt.timedelta(days=1)
        query = ("SELECT * FROM events WHERE event_start_dt >= '{}' and event_end_dt <= '{}' and user_group = {}".format(start,end,data['user_group']))
    else:
        query = ("SELECT * FROM events WHERE event_start_dt = '{}'  and user_group = {}".format(data['event_start_dt'], data['user_group']))

    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    cnx.close()
    if len(rows) > 0:
        if len(data['event_start_dt']) == 16:
            in_start = dt.datetime.strptime(data['event_start_dt'], '%Y-%m-%dT%H:%M')
            if 'event_end_dt' in data:
                in_end = dt.datetime.strptime(data['event_end_dt'], '%Y-%m-%dT%H:%M')
            for row in rows:
                if 'event_end_dt' in data:
                    if in_start >= row[2] and in_end <= row[3]:
                        return False
                    elif in_start < row[2] and in_end > row[3]:
                        return False
                    elif in_start < row[2] <= in_end <= row[3]:
                        return False
                    elif row[2] < in_start <= row[3] < in_end:
                        return False
                    else:
                        return True
                else:
                    if in_start == row[2]:
                        return False
                    else:
                        return True
        else:
            in_start = dt.datetime.strptime(data['event_start_dt'], '%Y-%m-%d')
            if 'event_end_dt' in data:
                in_end = dt.datetime.strptime(data['event_end_dt'], '%Y-%m-%d')
            for row in rows:
                if 'event_end_dt' in data:
                    if in_start >= row[2] and in_end <= row[3]:
                        return False
                    elif in_start < row[2] and in_end > row[3]:
                        return False
                    elif in_start < row[2] <= in_end <= row[3]:
                        return False
                    elif row[2] < in_start <= row[3] < in_end:
                        return False
                    else:
                        return True
                else:
                    if in_start == row[2]:
                        return False
                    else:
                        return True
    else:
        return True


def update_events(request):
    #  function used to update events. Both insert and update methods
    in_data = json.load(request)
    cnx = mysql.connector.connect(user=user, password=password, host=host, database=database, port=port)
    cursor = cnx.cursor()
    if 'drop' in in_data:
        query = ("DELETE FROM events WHERE event_id = {}".format(in_data['event_id']))
    elif 'event_id' in in_data:
        if 'event_end_dt' in in_data:
            query = ("UPDATE events SET event_name = '{}', event_start_dt = '{}', event_end_dt = '{}', event_group = {}, description = '{}' WHERE event_id = {}".format(in_data['event_name'],in_data['event_start_dt'],in_data['event_end_dt'],in_data['event_group'],in_data['description'],in_data['event_id']))
        else:
            query = ("UPDATE events SET event_name = '{}', event_start_dt = '{}', event_group = {}, description = '{}' WHERE event_id = {}".format(in_data['event_name'], in_data['event_start_dt'],in_data['event_group'],in_data['description'], in_data['event_id']))
    else:
        if 'event_end_dt' in in_data:
            query = ("INSERT INTO events (user_group,event_name,event_start_dt,event_end_dt,event_group,description) VALUES ({},'{}','{}','{}',{},'{}')".format(in_data['user_group'],in_data['event_name'],in_data['event_start_dt'],in_data['event_end_dt'],in_data['event_group'],in_data['description']))
        else:
            query = ("INSERT INTO events (user_group,event_name,event_start_dt,event_group,description) VALUES ({},'{}','{}',{},'{}')".format(in_data['user_group'], in_data['event_name'], in_data['event_start_dt'],in_data['event_group'],in_data['description']))

    data = {}
    if 'event_id' in in_data or check_events(in_data):
        data['success'] = True
        cursor.execute(query)
    else:
        data['success'] = False
        data['msg'] = "There is an event conflict during this time"
    cnx.commit()
    cursor.close()
    cnx.close()
    return JsonResponse(data, safe=False)

