import psycopg2
import datetime

creds_file = open('creds.txt', 'r')
lines = creds_file.read().splitlines()
username = lines[0]
password = lines[1]
database_name = lines[2]
creds_file.close()

database_connection_string = "dbname={} user={} password={} host=localhost port=5432".format(database_name, username, password)
connection = psycopg2.connect(database_connection_string)
cursor = connection.cursor()


date_string = '2016-12-21'
date_array = date_string.split('-')

date_object = datetime.datetime.strptime(date_string, '%Y-%M-%d')

values_tuple = ('zzzz', 'zzz', 'zzz', 'zzz', 'zzz', date_object, 'zzz', 'zzz', 2000)
sql_query_string = "INSERT INTO articles (title, body, url, uri, event_uri, date, source_name, source_url, source_id) VALUES %s RETURNING id"
cursor.execute(sql_query_string, (values_tuple,))

connection.commit()

connection.close()
