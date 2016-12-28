from eventregistry import *
from helpers import *
import time

er = EventRegistry()
recentQ = GetRecentArticles(maxArticleCount = 200)

valid_sources = ["Breitbart", "National Review Online", "The Blaze", "Daily Caller", "Washington Examiner", "Fox News", "The Wall Street Journal", "The Economist", "Forbes", "CNN", "New York Times", "The Washington Post", "NBC News", "ABC News", "CBS News", "Reuters", "Bloomberg", "USA Today", "Mother Jones", "Salon", "Slate", "www.aljazeera.com", "BBC", "RT English", "The Guardian", "The Intercept"]

while True:
    articleList = recentQ.getUpdates(er)
    print("=======\n%d articles were added since the last call" % len(articleList))

    # do whatever you need to with the articleList
    for article in articleList:
        print(article)
        # Ignore articles that aren't valid sources
        if article['source']['title'] not in valid_sources:
            continue

        # print("Added article %s: %s" % (article["uri"], article["title"].encode("ascii", "ignore")))

    # wait a bit for new content to be added to Event Registry
    print("sleeping for 60 seconds...")
    time.sleep(60)
