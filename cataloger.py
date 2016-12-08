import psycopg2
import json
from eventregistry import *
import time
import sys

creds_file = open('creds.txt', 'r')
lines = creds_file.read().splitlines()
username = lines[0]
password = lines[1]
database_name = lines[2]
creds_file.close()

database_connection_string = "dbname={} user={} password={}".format(database_name, username, password)
connection = psycopg2.connect(database_connection_string)
cursor = connection.cursor()

# connection = pg8000.connect(user=username, password=password, database=database_name)
# cursor = connection.cursor()

er = EventRegistry("http://eventregistry.org", verboseOutput = True)
q = QueryArticles()

# Get articles from 11/1/2016 - 12/7/2016
q.setDateLimit(datetime.date(2016, 11, 1), datetime.date(2016, 12, 7))

# Conservative Sources
q.addNewsSource(er.getNewsSourceUri("Breitbart"))
q.addNewsSource(er.getNewsSourceUri("National Review Online"))
q.addNewsSource(er.getNewsSourceUri("The Blaze"))
# q.addNewsSource(er.getNewsSourceUri("Daily Caller"))
# q.addNewsSource(er.getNewsSourceUri("Washington Times"))
# q.addNewsSource(er.getNewsSourceUri("Washington Examiner"))
# q.addNewsSource(er.getNewsSourceUri("Fox News"))
#
# # Right Leaning
# q.addNewsSource(er.getNewsSourceUri("The Wall Street Journal"))
# q.addNewsSource(er.getNewsSourceUri("The Economist"))
#
# # Moderate
# q.addNewsSource(r.getNewsSourceUri("Forbes"))
#
# # Left Leaning
# q.addNewsSource(er.getNewsSourceUri("CNN"))
# q.addNewsSource(er.getNewsSourceUri("New York Times"))
# q.addNewsSource(er.getNewsSourceUri("The Washington Post"))
# q.addNewsSource(er.getNewsSourceUri("NBC News"))
# q.addNewsSource(er.getNewsSourceUri("ABC News"))
# q.addNewsSource(er.getNewsSourceUri("CBS News"))
# q.addNewsSource(er.getNewsSourceUri("Reuters"))
# q.addNewsSource(er.getNewsSourceUri("Bloomberg"))
# q.addNewsSource(er.getNewsSourceUri("USA Today"))
#
# # Liberal Sources
# q.addNewsSource(er.getNewsSourceUri("Mother Jones"))
# q.addNewsSource(er.getNewsSourceUri("Salon"))
# q.addNewsSource(er.getNewsSourceUri("Slate"))
#
# # International News
# q.addNewsSource(er.getNewsSourceUri("www.aljazeera.com"))
# q.addNewsSource(r.getNewsSourceUri("BBC"))
# q.addNewsSource(er.getNewsSourceUri("RT English"))
# q.addNewsSource(er.getNewsSourceUri("The Guardian"))
# q.addNewsSource(er.getNewsSourceUri("The Intercept"))

# # return details about the articles
q.addRequestedResult(RequestArticlesInfo(count=1,
    returnInfo=ReturnInfo(
        articleInfo=ArticleInfoFlags(duplicateList=False, concepts=False, categories=False, location=False, image=False))))
# # execute the query
res = er.execQuery(q)

for r in res['articles']['results']:
    for key, value in r.items():
        if isinstance(value, dict):
            for k, v in value.items():
                value[k] = str(v)
        else:
            r[key] = str(value)

    values_tuple = (r['title'], r['body'], r['url'], r['uri'], r['eventUri'], r['date'], r['source']['title'], r['source']['uri'], r['source']['id'])
    print(values_tuple)
    sys.exit()
    sql_query_string = "INSERT INTO articles VALUES %s RETURNING *"
    cursor.execute(sql_query, (values_tuple,))

    # sql_query = "INSERT INTO articles (title, body, url, uri, eventUri, date, source_title, source_uri, source_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", values_tuple
    print(sql_query)
    cursor.execute(sql_query)
# output = open('output.txt', 'w')
# output.write(str(ret))
