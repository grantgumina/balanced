from eventregistry import *
from helpers import *
import psycopg2
import json
import time
import sys

creds_file = open('creds.txt', 'r')
lines = creds_file.read().splitlines()
username = lines[0]
password = lines[1]
database_name = lines[2]
creds_file.close()

database_connection_string = "dbname={} user={} password={} host=localhost port=5432".format(database_name, username, password)
connection = psycopg2.connect(database_connection_string)
cursor = connection.cursor()
er = EventRegistry()

conservative_news_sources = ["Breitbart", "National Review Online", "The Blaze", "Daily Caller", "Washington Examiner", "Fox News"]
right_leaning_news_sources = ["The Wall Street Journal", "The Economist"]
moderate_news_sources = ["Forbes"]
left_leaning_news_sources = ["CNN", "New York Times", "The Washington Post", "NBC News", "ABC News", "CBS News", "Reuters", "Bloomberg", "USA Today"]
liberal_news_sources = ["Mother Jones", "Salon", "Slate"]
international_news_sources = ["www.aljazeera.com", "BBC", "RT English", "The Guardian", "The Intercept"]

# news_sources = conservative_news_sources + right_leaning_news_sources + moderate_news_sources + left_leaning_news_sources + liberal_news_sources + international_news_sources

news_sources = moderate_news_sources

for ns in news_sources:
    q = QueryArticles()
    q.addNewsSource(er.getNewsSourceUri(ns))

    # Get 10 articles per news soruce
    q.addRequestedResult(RequestArticlesInfo(count=1,
        returnInfo=ReturnInfo(
            articleInfo=ArticleInfoFlags(duplicateList=False, concepts=True, categories=False, location=False, image=False))))

    # Get articles from this news source
    res = er.execQuery(q)

    if res is not None and res['articles'] is not None and res['articles']['results'] is not None:

        for r in res['articles']['results']:
            for key, value in r.items():
                if key != 'concepts':
                    if isinstance(value, dict):
                        for k, v in value.items():
                            value[k] = convertToString(v)
                    else:
                        r[key] = convertToString(value)

            values_tuple = (r['title'], r['body'], r['url'], r['uri'], r['eventUri'], r['date'], r['source']['title'], r['source']['uri'], r['source']['id'])

            # Insert article into database
            sql_query_string = "INSERT INTO articles (title, body, url, uri, event_uri, date, source_name, source_url, source_id) VALUES %s"
            cursor.execute(sql_query_string, (values_tuple,))
            print("Succesfully inserted article")

            # Insert keywords into database
            high_score_concepts = []
            concepts = r['concepts']
            print(len(concepts))
            print(concepts)


                # name = c['label'].values()[0]
                # concept_id = int(c['id'])
                #
                # curi = er.getConceptUri(name)
                # score = int(c['score'])

            #     if score >= 4:
            #         keyword_entry_tuple = (convertToString(name), score, concept_id)
            #         keywords_sql_query_string = "INSERT INTO keywords (keyword, score, article_id) VALUES %s"
            #         cursor.execute(keywords_sql_query_string, (keyword_entry_tuple,))

        # Commit the changes for each news source
        # connection.commit()

# Close connection
connection.close()
