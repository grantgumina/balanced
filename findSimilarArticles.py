from eventregistry import *
from helpers import*
import sys

er = EventRegistry()

first_article_high_score_concepts = []

first_article_query = QueryArticle("557861092")
first_article_query.addRequestedResult(RequestArticleInfo(returnInfo=ReturnInfo(
        articleInfo=ArticleInfoFlags(duplicateList=False, concepts=True, categories=True, location=False, image=False))))

first_article = er.execQuery(first_article_query)

similar_articles_query = QueryArticles()
similar_articles_query.addNewsSource(er.getNewsSourceUri("Breitbart"))

# for ns in news_sources:
#     q = QueryArticles()
#     q.addNewsSource(er.getNewsSourceUri(ns))
#
#     # Get 10 articles per news soruce
#     q.addRequestedResult(RequestArticlesInfo(count=1,
#         returnInfo=ReturnInfo(
#             articleInfo=ArticleInfoFlags(duplicateList=False, concepts=True, categories=True, location=False, image=False))))
#
#     res = er.execQuery(q)
#     for r in res['articles']['results']:
#         print(r['title'])
#         print(r['id'])
#         concepts = r['concepts']
#
#         for c in concepts:
#             name = c['label'].values()[0]
#             concept_id = int(c['id'])
#
#             curi = er.getConceptUri(name)
#
#             print(">> {}".format(curi))
#             score = int(c['score'])
#
#             if score <= 4:
#                 keyword_entry = (convertToString(name), score, concept_id)
#                 high_score_concepts.append(keyword_entry)
#
# print(high_score_concepts)
