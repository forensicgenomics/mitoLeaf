# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


# default file paths used during the 'tree_dat_process' script.
# paths denoted are relative to root.

# raw files needed in inputfiles
XML_FILE = "inputfiles/mitoTree_v1.0_phm.xml"
HGMOTIFS_FILE = "inputfiles/mitoTree_v1.0_hgmotifs.csv"
COLORCODE_FILE = "inputfiles/superhaplo_colorcodes.csv"
SUPERHAPLO_FILE = "inputfiles/superhaplogroups.txt"
PHYLO_SUPERHAPLO_FILE = "inputfiles/phylo_superhaplogroups.txt"
SEQ_TECH = "inputfiles/metadata/61302_sequencing_technology.txt"
COUNTRY = "inputfiles/metadata/country_61302_final.txt"
MOTIF_REPRESENTATIVES = "inputfiles/metadata/mitoTree_61302_representatives.txt"

# destination where to write files
# this should be the data dir within the dir used to build the webpage
DATA_DEST = "docs/data/"
