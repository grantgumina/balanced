def convertToString(v):
    if v is None:
        return 'None'

    try:
        return v.encode('ascii', 'ignore')
    except:
        return str(v)
