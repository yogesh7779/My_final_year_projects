import numpy as np
import re
import itertools
from urllib.parse import urlparse

def extract_features(url):
    features = {}

    # Basic URL features
    features['length_url'] = len(url)

    parsed = urlparse(url)
    hostname = parsed.netloc
    path = parsed.path

    features['length_hostname'] = len(hostname)

    ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    features['ip'] = 1 if re.match(ip_pattern, hostname.split(':')[0]) else 0

    # Count special characters
    features['nb_dots'] = url.count('.')
    features['nb_hyphens'] = url.count('-')
    features['nb_at'] = url.count('@')
    features['nb_qm'] = url.count('?')
    features['nb_and'] = url.count('&')
    features['nb_or'] = url.count('|')
    features['nb_eq'] = url.count('=')
    features['nb_underscore'] = url.count('_')
    features['nb_tilde'] = url.count('~')
    features['nb_percent'] = url.count('%')
    features['nb_slash'] = url.count('/')
    features['nb_star'] = url.count('*')
    features['nb_colon'] = url.count(':')
    features['nb_comma'] = url.count(',')
    features['nb_semicolon'] = url.count(';')
    features['nb_dollar'] = url.count('$')
    features['nb_space'] = url.count(' ')
    features['nb_www'] = 1 if 'www' in hostname.lower() else 0
    features['nb_com'] = 1 if 'com' in hostname.lower() else 0
    features['nb_dslash'] = url.count('//')
    features['http_in_path'] = 1 if 'http' in path.lower() else 0
    features['https_token'] = 1 if url.startswith('https://') else 0

    digits_count = sum(c.isdigit() for c in url)
    features['ratio_digits_url'] = digits_count / len(url) if len(url) > 0 else 0

    digits_count_host = sum(c.isdigit() for c in hostname)
    features['ratio_digits_host'] = digits_count_host / len(hostname) if len(hostname) > 0 else 0

    features['punycode'] = 1 if 'xn--' in hostname.lower() else 0
    features['port'] = 1 if ':' in hostname and any(c.isdigit() for c in hostname.split(':')[1]) else 0

    tlds = ['.com', '.org', '.net', '.edu', '.gov', '.mil', '.int', '.biz', '.info', '.mobi', '.name', '.ly']
    features['tld_in_path'] = 1 if any(tld in path.lower() for tld in tlds) else 0
    features['tld_in_subdomain'] = 1 if hostname.count('.') > 1 and any(tld in hostname.lower().split('.')[0] for tld in tlds) else 0
    features['abnormal_subdomain'] = 1 if hostname.count('.') > 2 else 0
    features['nb_subdomains'] = hostname.count('.')
    features['prefix_suffix'] = 1 if '-' in hostname else 0
    features['random_domain'] = 0

    shortening_services = [
        'bit.ly','goo.gl','t.co','tinyurl.com','is.gd','cli.gs','on.ly','short.cm','tiny.cc',
        'shorte.st','x.co','prettylinkpro.com','viralurl.com','qr.net','lurl.no','tweez.me',
        'v.gd','tr.im','link.zip.net'
    ]
    features['shortening_service'] = 1 if any(service in hostname.lower() for service in shortening_services) else 0

    path_extensions = ['.php','.html','.htm','.asp','.aspx','.jsp','.js','.css','.py']
    features['path_extension'] = 1 if any(ext in path.lower() for ext in path_extensions) else 0

    features['nb_redirection'] = url.count('http') - 1 if url.count('http') > 1 else 0
    features['nb_external_redirection'] = 0

    raw_words = re.findall(r'[a-zA-Z0-9]+', url)
    host_words = re.findall(r'[a-zA-Z0-9]+', hostname)
    path_words = re.findall(r'[a-zA-Z0-9]+', path)

    features['length_words_raw'] = len(raw_words)
    features['char_repeat'] = max([len(list(group)) for _, group in itertools.groupby(url)], default=0)
    features['shortest_word_raw'] = min([len(word) for word in raw_words], default=0) if raw_words else 0
    features['shortest_word_host'] = min([len(word) for word in host_words], default=0) if host_words else 0
    features['shortest_word_path'] = min([len(word) for word in path_words], default=0) if path_words else 0
    features['longest_word_raw'] = max([len(word) for word in raw_words], default=0) if raw_words else 0
    features['longest_word_host'] = max([len(word) for word in host_words], default=0) if host_words else 0
    features['longest_word_path'] = max([len(word) for word in path_words], default=0) if path_words else 0
    features['avg_word_raw'] = sum([len(word) for word in raw_words]) / len(raw_words) if raw_words else 0
    features['avg_word_host'] = sum([len(word) for word in host_words]) / len(host_words) if host_words else 0
    features['avg_word_path'] = sum([len(word) for word in path_words]) / len(path_words) if path_words else 0

    phishing_words = ['secure','account','verify','login','update','signin','banking','confirm']
    features['phish_hints'] = 1 if any(word in url.lower() for word in phishing_words) else 0

    features['domain_in_brand'] = 0
    features['brand_in_subdomain'] = 0
    features['brand_in_path'] = 0

    features['suspecious_tld'] = 1 if any(hostname.lower().endswith(tld) for tld in [
        '.tk','.xyz','.top','.ml','.ga','.cf','.gq'
    ]) else 0

    ordered_features = [
        features[key] for key in [
        'length_url','length_hostname','ip','nb_dots','nb_hyphens','nb_at','nb_qm','nb_and','nb_or',
        'nb_eq','nb_underscore','nb_tilde','nb_percent','nb_slash','nb_star','nb_colon','nb_comma',
        'nb_semicolon','nb_dollar','nb_space','nb_www','nb_com','nb_dslash','http_in_path',
        'https_token','ratio_digits_url','ratio_digits_host','punycode','port','tld_in_path',
        'tld_in_subdomain','abnormal_subdomain','nb_subdomains','prefix_suffix','random_domain',
        'shortening_service','path_extension','nb_redirection','nb_external_redirection',
        'length_words_raw','char_repeat','shortest_word_raw','shortest_word_host','shortest_word_path',
        'longest_word_raw','longest_word_host','longest_word_path','avg_word_raw','avg_word_host',
        'avg_word_path','phish_hints','domain_in_brand','brand_in_subdomain','brand_in_path',
        'suspecious_tld'
    ]]
    return np.array(ordered_features, dtype=np.float64)
