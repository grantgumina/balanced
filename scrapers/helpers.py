import psycopg2
import sys
import os

CURRENT_DIR = os.path.dirname(__file__)

# def convertToLocalDateTime(utc_datetime):
#     from_zone = tz.tzutc()
#     to_zone = tz.tzlocal()
#
#     return convertTimeZone(utc_datetime, from_zone, to_zone)
#
# def convertToUTCDateTime(local_datetime):
#     from_zone = tz.tzlocal()
#     to_zone = tz.tzutc()
#
#     return convertTimeZone(local_datetime, from_zone, to_zone)
#
# def convertTimeZone(original_datetime, from_zone, to_zone):
#     original_datetime = original_datetime.replace(tzinfo=from_zone)
#     new_datetime = original_datetime.astimezone(to_zone)
#
#     return new_datetime

def convertToString(v):
    if v is None:
        return 'None'

    try:
        return v.encode('ascii', 'ignore')
    except:
        return str(v)

def execute_sql_query(sql_query_string, *args, **kwargs):
    creds_text_path = os.path.join(CURRENT_DIR, '../creds.txt')

    creds_file = open(creds_text_path, 'r')
    lines = creds_file.read().splitlines()
    username = lines[0]
    password = lines[1]
    database_name = lines[2]
    creds_file.close()

    parameter_tuple = kwargs.get('parameter_tuple')
    return_data = kwargs.get('return_data')

    database_connection_string = "dbname={} user={} password={} host=localhost port=5432".format(database_name, username, password)
    connection = psycopg2.connect(database_connection_string)
    cursor = connection.cursor()

    results = None

    try:
        if parameter_tuple is not None:
            cursor.execute(sql_query_string, (parameter_tuple,))
        else:
            cursor.execute(sql_query_string)

        connection.commit()

        if return_data is not None and return_data == True:
            results = cursor.fetchall()

    except Exception as e:
        print("Failed to insert row: {}".format(parameter_tuple))
        print(e)

    cursor.close()
    connection.close()

    if return_data is not None and return_data == True:
        return results
