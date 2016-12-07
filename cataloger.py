import pg8000
import json
from eventregistry import *
import time

#er = EventRegistry()
er = EventRegistry("http://eventregistry.org", verboseOutput = True)
q = QueryArticles()

# print er.getNewsSourceUri("New York Times")
# print er.getNewsSourceUri("Breitbart")

# # articles published on 2016-03-22 or 2016-03-23
# q.setDateLimit(datetime.date(2016, 03, 22), datetime.date(2016, 03, 23))

# # published by New York Times
# q.addNewsSource(er.getNewsSourceUri("New York Times"))
q.addNewsSource(er.getNewsSourceUri("Breitbart"))

# # return details about the articles
q.addRequestedResult(RequestArticlesInfo(count = 5,
    returnInfo = ReturnInfo(
        articleInfo = ArticleInfoFlags(duplicateList = False, concepts = False, categories = False, location = False, image = False))))
# # execute the query
res = er.execQuery(q)
print res

# output = open('output.txt', 'w')
# output.write(str(ret))


# creds_file = open('creds.txt', 'r')
# username = creds_file.read()
# password = creds_file.read()
# creds_file.close()
#
# connection = pg8000.connect(user=username, password=password)
# cursor = connection.cursor()
#
