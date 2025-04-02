# This file is part of the mitoLEAF (formerly mitoTree) project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoLEAF.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


################################
#
# helper files used to read inputfiles
#
################################

import csv


# Mainly copied from u/(Pablo Daniel Estigarribia Davy) @ https://stackoverflow.com/a/32933124
# used to read two column csv files into a dict
# used for input files such as 'superhaplo_colorcodes.csv'
def csv_as_dict(file, delimiter=None):
    if not delimiter:
        delimiter = ';'
    reader = csv.reader(open(file, encoding='utf-8-sig'), delimiter=delimiter)
    result = {}
    next(reader)
    for row in reader:
        key, value = row
        if key in result:
            pass
        result[key] = value
    return result


def read_txt(file):
    with open(file, mode='r') as f:
        lines = f.read().split("\n")
    return lines
