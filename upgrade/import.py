"""
Imports the kibana objects into Elasticsearch
:return: True if operation is completed successfully, False otherwise.
"""
import sys
import os
import json

import argparse
import requests


def parse_argv():
    """Parses the command line arguments"""
    if not len(sys.argv) > 1:
        print(">>> You did not provide any or all of the arguments - defaults will be used!")

    # Test parameter settings
    cl_parse = argparse.ArgumentParser()

    # Common arguments
    cl_parse.add_argument(
        '--apihost', action='store', default='localhost',
        help='full hostname or IP address of the timings server (default=localhost)')
    cl_parse.add_argument(
        '--apiport', action='store', default='80',
        help='port of the timings server (default=80)')
    cl_parse.add_argument(
        '--esprotocol', action='store', default='http',
        help='scheme used by the elasticsearch server (default=http)')
    cl_parse.add_argument(
        '--eshost', action='store', default='localhost',
        help='full hostname or IP address of the elasticsearch server (default=localhost)')
    cl_parse.add_argument(
        '--esport', action='store', default='9200',
        help='port of the elasticsearch server (default=9200)')
    cl_parse.add_argument(
        '--esuser', action='store',
        help='username for elasticsearch - if required')
    cl_parse.add_argument(
        '--espasswd', action='store',
        help='The password for elasticsearch - if required')
    cl_parse.add_argument(
        '--kbindex', action='store', default='.kibana',
        help='the kibana index (default=.kibana)')
    cl_parse.add_argument(
        '--kbhost', action='store', default='localhost',
        help='full hostname or IP address of the kibana server (default=localhost)')
    cl_parse.add_argument(
        '--kbport', action='store', default='5601',
        help='port of the kibana server (default=5601)')
    cl_parse.add_argument(
        '--replace', action='store',
        help='replace `TIMINGS` with this string')

    return cl_parse.parse_args()


def kb_import(import_json):
    """Import dashboards, visualizations and index-patterns into Kibana"""
    try:
        for item in import_json:
            _id = item["_id"]
            _type = item["_type"]
            _source = item["_source"]
            _title = _source["title"]

            if _type == 'index-pattern' and _id == 'cicd-perf*':
                if OPTIONS.apiport != '80':
                    api_host = OPTIONS.apihost + ':' + OPTIONS.apiport
                else:
                    api_host = OPTIONS.apihost

                _source['fieldFormatMap'] = _source['fieldFormatMap'].replace(
                    '__api__hostname', api_host)

            response = requests.post(
                BASE_IMPORT_URL + '/' + OPTIONS.kbindex +
                '/' + _type + '/' + _id,
                data=json.dumps(_source),
                headers={'content-type': 'application/json'},
                auth=(OPTIONS.esuser, OPTIONS.espasswd)
            )

            check_es_response(response, 'import [' + _type + ']', _title)

        return True, sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def set_default_index(index):
    """Set cicd-perf* as the default index"""
    try:
        response = requests.put(
            BASE_IMPORT_URL + '/' + OPTIONS.kbindex + '/config/5.6.2',
            data=json.dumps({'defaultIndex': index}),
            headers={'content-type': 'application/json'},
            auth=(OPTIONS.esuser, OPTIONS.espasswd)
        )

        return check_es_response(response, 'default index', 'cicd-perf*'), sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def del_index_pattern(pattern):
    """Delete Kibana index-pattern"""
    try:
        response = requests.delete(
            BASE_IMPORT_URL + '/' + OPTIONS.kbindex + '/index-pattern/' + pattern,
            headers={'content-type': 'application/json'},
            auth=(OPTIONS.esuser, OPTIONS.espasswd)
        )

        return check_es_response(response, 'delete index-pattern', pattern), sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def del_index(index):
    """Delete Kibana index-pattern"""
    try:
        response = requests.delete(
            BASE_IMPORT_URL + '/' + index,
            headers={'content-type': 'application/json'},
            auth=(OPTIONS.esuser, OPTIONS.espasswd)
        )

        return check_es_response(response, 'delete index', index), sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def add_template(template):
    """Adds basic template for cicd-perf* index to ElasticSearch"""
    try:
        response = requests.post(
            BASE_IMPORT_URL + '/_template/cicd-perf',
            data=json.dumps(template),
            headers={'content-type': 'application/json'},
            auth=(OPTIONS.esuser, OPTIONS.espasswd)
        )

        return check_es_response(response, 'add template', 'cicd-perf'), sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def reindex(src, dst):
    """Reindexes an index to another index and removes the original"""
    print("Currently reindexing [{0}] -> [{1}] -- this may take some time!".format(src, dst))
    try:
        response = requests.post(
            BASE_IMPORT_URL + '/_reindex',
            data=json.dumps({"source": {"index": src}, "dest": {"index": dst}}),
            headers={'content-type': 'application/json'},
            auth=(OPTIONS.esuser, OPTIONS.espasswd)
        )

        return check_es_response(response, 'reindex', src + ' -> ' + dst), sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def add_sample_data(perf_json, index, data_type, _id):
    """Adds sample data to main indices (cicd-perf* and cicd-resource*)"""
    doc_type = data_type
    if data_type == 'resource_nav' or data_type == 'resource_uri':
        doc_type = 'resource'

    try:
        response = requests.post(
            BASE_IMPORT_URL + '/' + index + '/' + doc_type + '/' + _id + '/',
            data=json.dumps(perf_json[data_type]),
            headers={'content-type': 'application/json'},
            auth=(OPTIONS.esuser, OPTIONS.espasswd)
        )

        return check_es_response(response, 'add sample data', data_type), sys._getframe().f_code.co_name

    except requests.exceptions.RequestException as err:
        print(err)
        return False


def check_es_response(response, job, item):
    """Check the request responses and prints results"""
    job_summ = "job: {0} - item: {1}".format(job, item)
    if response.ok:
        result = "PASS"
        r_info = json.loads(response.text)
        if "result" in r_info:
            result = r_info["result"].upper()
        elif "total" in r_info:
            if r_info["created"]:
                result = "CREATED ({0} items)".format(r_info["created"])
            if r_info["deleted"]:
                result = "DELETED ({0} items)".format(r_info["deleted"])
            if r_info["updated"]:
                result = "UPDATED ({0} items)".format(r_info["updated"])

        print("{0}-{1}".format(result, job_summ))
        return True, job

    print('FAIL - {0} - StatusCode: {1} - Reason: {2}'.format(
        job_summ, response.status_code, response.reason))
    return False


def check_result(res):
    """Check the result and exit if False"""
    if res[0] is False:
        sys.exit("Something went wrong during [{0}]!".format(res[1]))


if __name__ == '__main__':
    OPTIONS = parse_argv()

    BASE_IMPORT_URL = '{0}://{1}:{2}'.format(OPTIONS.esprotocol, OPTIONS.eshost, OPTIONS.esport)

    STRING = ("Starting import to server [{0}] on port [{1}] to index [{2}]".format(
        OPTIONS.eshost, OPTIONS.esport, OPTIONS.kbindex))
    print(STRING)
    print("=" * len(STRING))

    while True:
        del_index_pattern('cicd-perf')
        del_index_pattern('cicd-perf-res')
        del_index_pattern('cicd-perf-errorlog')

        IMPORT_FILE = open(os.path.join(os.path.abspath(
            os.path.dirname(__file__)), 'kibana_items.json')).read()

        if OPTIONS.replace:
            IMPORT_FILE = IMPORT_FILE.replace("TIMINGS", OPTIONS.replace.upper())

        IMPORT_JSON = json.loads(IMPORT_FILE)

        check_result(kb_import(IMPORT_JSON))
        check_result(set_default_index('cicd-perf*'))

        TEMPLATE_JSON = json.load(
            open(os.path.join(os.path.abspath(
                os.path.dirname(__file__)
            ), 'cicd_template.json')))

        check_result(add_template(TEMPLATE_JSON))
        check_result(reindex('cicd-perf-res', 'cicd-resource'))
        check_result(del_index('cicd-perf-res'))
        check_result(reindex('cicd-perf-errorlog', 'cicd-errorlog'))
        check_result(del_index('cicd-perf-errorlog'))

        PERF_JSON = json.load(
            open(os.path.join(os.path.abspath(
                os.path.dirname(__file__)
            ), 'sample_data.json')))

        add_sample_data(PERF_JSON, 'cicd-perf', 'navtiming', '1')
        add_sample_data(PERF_JSON, 'cicd-resource', 'resource_nav', '1')
        add_sample_data(PERF_JSON, 'cicd-resource', 'resource_uri', '2')
