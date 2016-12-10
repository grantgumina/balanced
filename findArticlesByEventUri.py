from eventregistry import *
from helpers import*
import sys

# eng-2682034

er = EventRegistry()
event_uri = 'eng-2682034'
q = QueryEvent(event_uri)
q.addRequestedResult(RequestEventArticles(page = 1, count = 10, returnInfo = ReturnInfo(articleInfo = ArticleInfoFlags(body = False))))

eventRes = er.execQuery(q)
for res in eventRes[event_uri]['articles']['results']:
    print(res)
    print('==')
