from collections import defaultdict
from eventregistry import *
from time import sleep
from helpers import *
import psycopg2
import json
import sys
import os

CURRENT_DIR = os.path.dirname(__file__)

sql_query_string = "INSERT INTO articles (title, body, url, uri, event_uri, date, source_name, source_url, source_id) VALUES %s RETURNING id"
concepts_sql_query_string = "INSERT INTO concepts (name, score, event_registry_id, event_registry_uri, article_id) VALUES %s"

er = EventRegistry()

conservative_news_sources, right_leaning_news_sources, moderate_news_sources, left_leaning_news_sources, liberal_news_sources, international_news_sources = ["Breitbart", "National Review Online", "The Blaze", "Daily Caller", "Washington Examiner", "Fox News"], ["The Wall Street Journal", "The Economist"], ["Forbes"], ["CNN", "New York Times", "The Washington Post", "NBC News", "ABC News", "CBS News", "Reuters", "Bloomberg", "USA Today"], ["Mother Jones", "Salon", "Slate"], ["www.aljazeera.com", "BBC", "RT English", "The Guardian", "The Intercept"]
news_sources = { 'conservative': conservative_news_sources, 'right_leaning': right_leaning_news_sources, 'moderate': moderate_news_sources, 'left_leaning': left_leaning_news_sources, 'liberal': liberal_news_sources }

start_date = ''
end_date = datetime.datetime.now().date()

print('Reading start time file')
# Read time file
start_datetime_file = os.path.join(CURRENT_DIR, 'start_datetime.txt')
with open(start_datetime_file, 'r') as f:
    content = f.read().strip()
    start_date = datetime.datetime.strptime(content, "%Y-%m-%d").date()
print('start_datetime: {}'.format(start_date))
print('end_datetime:   {}'.format(end_date))
print('Finished reading start time file')

for key in news_sources:
    for ns in news_sources[key]:

        q = QueryArticles()
        q.setDateLimit(start_date, end_date)
        q.addNewsSource(er.getNewsSourceUri(ns))

        # Get some articles from each news soruce
        q.addRequestedResult(RequestArticlesInfo(returnInfo=ReturnInfo(articleInfo=ArticleInfoFlags(duplicateList=False, concepts=True, categories=False, location=False, image=False))))

        # Get articles from this news source
        res = er.execQuery(q)

        if res is not None and 'articles' in res and 'results' in res['articles']:

            for r in res['articles']['results']:
                for key, value in r.items():
                    if key != 'concepts':
                        if isinstance(value, dict):
                            for k, v in value.items():
                                value[k] = convertToString(v)
                        else:
                            r[key] = convertToString(value)

                date_object = datetime.datetime.strptime(r['date'], '%Y-%M-%d')

                values_tuple = (r['title'], r['body'], r['url'], r['uri'], r['eventUri'], date_object, r['source']['title'], r['source']['uri'], r['source']['id'])

                # Get the ID of the newly inserted article
                execution_result = execute_sql_query(sql_query_string, parameter_tuple=values_tuple, return_data=True)

                # If the article was a duplicate or some error happened
                if execution_result == None:
                    continue

                newly_inserted_article_id = execution_result[0][0]

                print("Inserted article: {} from {}".format(r['title'], r['source']['title']))

                # Insert keywords into database
                concepts = r['concepts']

                print("Iterating through concepts")

                for c in concepts:
                    name = convertToString(c['label'].values()[0])
                    concept_id = int(c['id'])
                    curi = convertToString(c['uri'])
                    score = int(c['score'])

                    concepts_tuple = (name, score, concept_id, curi, newly_inserted_article_id)
                    execute_sql_query(concepts_sql_query_string, parameter_tuple=concepts_tuple)
                    print("Inserted concept: {}".format(name))

                print("{} requests remaining\n\n".format(er.getRemainingAvailableRequests()))
                sleep(3) # wait 3 seconds for the next request


print("Finished downloading articles.")
print('Writing to start time file')
with open(start_datetime_file, 'w') as f:
    f.write(str(end_date))
print('Finished writing to start time file')
print("===\n")
