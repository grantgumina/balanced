from collections import defaultdict
from eventregistry import *
from helpers import *
import psycopg2
import json
import time
import sys

number_of_articles_to_retrieve = 50

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

conservative_news_sources = ["Washington Examiner", "Fox News"] #"Breitbart", "National Review Online", "The Blaze", "Daily Caller",
right_leaning_news_sources = ["The Wall Street Journal", "The Economist"]
moderate_news_sources = ["Forbes"]
left_leaning_news_sources = ["CNN", "New York Times", "The Washington Post", "NBC News", "ABC News", "CBS News", "Reuters", "Bloomberg", "USA Today"]
liberal_news_sources = ["Mother Jones", "Salon", "Slate"]
international_news_sources = ["www.aljazeera.com", "BBC", "RT English", "The Guardian", "The Intercept"]

news_sources = conservative_news_sources + right_leaning_news_sources + moderate_news_sources + left_leaning_news_sources + liberal_news_sources + international_news_sources

for ns in news_sources:
    q = QueryArticles()
    q.setDateLimit(datetime.date(2016, 12, 12), datetime.date(2016, 12, 13))
    q.addNewsSource(er.getNewsSourceUri(ns))

    # Get some articles from each news soruce
    q.addRequestedResult(RequestArticlesInfo(count=number_of_articles_to_retrieve, returnInfo=ReturnInfo(articleInfo=ArticleInfoFlags(duplicateList=False, concepts=True, categories=False, location=False, image=False))))

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

            values_tuple = (r['title'], r['body'], r['url'], r['uri'], r['eventUri'], r['date'], r['source']['title'], r['source']['uri'], r['source']['id'])

            # Insert article into database
            sql_query_string = "INSERT INTO articles (title, body, url, uri, event_uri, date, source_name, source_url, source_id) VALUES %s RETURNING id"
            cursor.execute(sql_query_string, (values_tuple,))
            print("Succesfully inserted article: ", values_tuple)

            # Insert keywords into database
            high_score_concepts = []
            concepts = r['concepts']
            concepts_sorted_by_score = defaultdict(list)
            for c in concepts:
                name = c['label'].values()[0]
                concept_id = int(c['id'])

                curi = er.getConceptUri(name)
                score = int(c['score'])
                keyword_entry_tuple = (convertToString(name), score, concept_id, curi)
                concepts_sorted_by_score[score].append(keyword_entry_tuple)

            # Sort the ranked concepts by highest score first
            concepts_sorted_by_score_keys = sorted(concepts_sorted_by_score.iterkeys(), reverse=True)

            # Get the ID of the newly inserted article
            newly_inserted_article_id = cursor.fetchone()[0]

            # Insert the highest ranked concepts into the database
            if len(concepts_sorted_by_score_keys) > 0:
                for concepts_tuple in concepts_sorted_by_score[concepts_sorted_by_score_keys[0]]:
                    concepts_tuple = concepts_tuple + (newly_inserted_article_id,)

                    concepts_sql_query_string = "INSERT INTO concepts (name, score, event_registry_id, event_registry_uri, article_id) VALUES %s"
                    cursor.execute(concepts_sql_query_string, (concepts_tuple,))

        # Commit the changes for each news source
        connection.commit()

# Close connection
connection.close()
