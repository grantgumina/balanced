import psycopg2
import sys

def convertToString(v):
    if v is None:
        return 'None'

    try:
        return v.encode('ascii', 'ignore')
    except:
        return str(v)

def execute_sql_query(sql_query_string, *args, **kwargs):
    parameter_tuple = kwargs.get('parameter_tuple')
    return_data = kwargs.get('return_data')

    database_connection_string = "dbname={} user={} password={} host=localhost port=5432".format("balanced", "postgres", "abc123")
    connection = psycopg2.connect(database_connection_string)
    cursor = connection.cursor()

    results = None

    if parameter_tuple is not None:
        cursor.execute(sql_query_string, (parameter_tuple,))

    else:
        cursor.execute(sql_query_string)

    connection.commit()

    if return_data is not None and return_data == True:
        results = cursor.fetchall()

    cursor.close()
    connection.close()

    if return_data is not None and return_data == True:
        return results
